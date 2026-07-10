param(
    [string]$Api = 'https://api.novixa.vn',
    [string]$Admin = 'https://admin.novixa.vn',
    [string]$Pos = 'https://pos.novixa.vn',
    [string]$TenantCode = '',
    [string]$AdminUser = '',
    [string]$AdminPass = ''
)

$ErrorActionPreference = 'Continue'
$passed = 0
$failed = @()
$warn = @()

function Test-Step([string]$Name, [scriptblock]$Block, [switch]$Optional) {
    try {
        & $Block
        Write-Host "[OK]   $Name" -ForegroundColor Green
        $script:passed++
    }
    catch {
        if ($Optional) {
            Write-Host "[SKIP] $Name - $($_.Exception.Message)" -ForegroundColor Yellow
            $script:warn += $Name
        }
        else {
            Write-Host "[FAIL] $Name - $($_.Exception.Message)" -ForegroundColor Red
            $script:failed += $Name
        }
    }
}

Write-Host "`n=== KitPlatform production ops smoke ===" -ForegroundColor Cyan
Write-Host "API=$Api Admin=$Admin POS=$Pos`n"

Test-Step 'API /health' {
    $h = Invoke-RestMethod "$Api/api/health" -TimeoutSec 15
    if ($h.status -ne 'ok') { throw "status=$($h.status)" }
}

Test-Step 'API /health/db' {
    $h = Invoke-RestMethod "$Api/api/health/db" -TimeoutSec 15
    if ($h.status -ne 'ok' -or -not $h.database) { throw ($h | ConvertTo-Json -Compress) }
}

Test-Step 'API setup-status' {
    $s = Invoke-RestMethod "$Api/api/platform/setup-status" -TimeoutSec 15
    if ($null -eq $s.tenantsCount) { throw 'missing tenantsCount' }
    if ($s.setupRequired) { throw 'setup still required' }
}

Test-Step 'Admin SPA index' {
    $r = Invoke-WebRequest "$Admin/" -TimeoutSec 15 -UseBasicParsing
    if ($r.StatusCode -ne 200 -or $r.Content -notmatch '<html') { throw "status=$($r.StatusCode)" }
    if ($r.Content -match 'localhost:5290|:5290/api') { throw 'bundle references dev port 5290' }
}

Test-Step 'POS SPA index' {
    $r = Invoke-WebRequest "$Pos/" -TimeoutSec 15 -UseBasicParsing
    if ($r.StatusCode -ne 200 -or $r.Content -notmatch '<html') { throw "status=$($r.StatusCode)" }
}

Test-Step 'POS manifest' {
    $m = Invoke-RestMethod "$Pos/manifest.webmanifest" -TimeoutSec 15
    if (-not $m.name) { throw 'missing manifest name' }
}

Test-Step 'POS bundle has staff UI markers' {
    $html = (Invoke-WebRequest "$Pos/" -TimeoutSec 15 -UseBasicParsing).Content
    $match = [regex]::Match($html, 'src="(/assets/index-[A-Za-z0-9_-]+\.js)"')
    if (-not $match.Success) { throw 'no main js in index' }
    $jsUrl = "$Pos$($match.Groups[1].Value)"
    $js = (Invoke-WebRequest $jsUrl -TimeoutSec 30 -UseBasicParsing).Content
    foreach ($marker in @('pos-home-btn', 'hub-logout', 'pos-customer-drawer')) {
        if ($js -notmatch [regex]::Escape($marker)) { throw "missing $marker in bundle" }
    }
}

Test-Step 'CORS preflight admin origin' {
    $headers = @{
        Origin = $Admin.TrimEnd('/')
        'Access-Control-Request-Method' = 'GET'
    }
    $r = Invoke-WebRequest "$Api/api/health" -Method OPTIONS -Headers $headers -TimeoutSec 15 -UseBasicParsing
    $acao = $r.Headers['Access-Control-Allow-Origin']
    if (-not $acao) { throw 'missing Access-Control-Allow-Origin' }
}

if ($TenantCode -and $AdminUser -and $AdminPass) {
    Test-Step 'Admin login + dashboard' {
        $auth = Invoke-RestMethod "$Api/api/auth/login" -Method POST -ContentType 'application/json' `
            -Body (@{ username = $AdminUser; password = $AdminPass; tenantCode = $TenantCode } | ConvertTo-Json) -TimeoutSec 20
        if (-not $auth.accessToken) { throw 'no token' }
        $h = @{ Authorization = "Bearer $($auth.accessToken)" }
        $d = Invoke-RestMethod "$Api/api/dashboard/overview" -Headers $h -TimeoutSec 20
        if ($null -eq $d.sales) { throw 'dashboard missing sales' }
    }

    Test-Step 'Sales orders API' {
        $auth = Invoke-RestMethod "$Api/api/auth/login" -Method POST -ContentType 'application/json' `
            -Body (@{ username = $AdminUser; password = $AdminPass; tenantCode = $TenantCode } | ConvertTo-Json)
        $h = @{ Authorization = "Bearer $($auth.accessToken)" }
        Invoke-RestMethod "$Api/api/sales/orders?page=1&pageSize=1" -Headers $h -TimeoutSec 20 | Out-Null
    }

    Test-Step 'Open shift status API' {
        $auth = Invoke-RestMethod "$Api/api/auth/login" -Method POST -ContentType 'application/json' `
            -Body (@{ username = $AdminUser; password = $AdminPass; tenantCode = $TenantCode } | ConvertTo-Json)
        $h = @{ Authorization = "Bearer $($auth.accessToken)" }
        $wh = @(Invoke-RestMethod "$Api/api/inventory/warehouses" -Headers $h -TimeoutSec 20)
        if ($wh.Count -lt 1) { throw 'no warehouse' }
        $wid = $wh[0].id
        try {
            Invoke-RestMethod "$Api/api/sales/shifts/current?warehouseId=$wid" -Headers $h -TimeoutSec 20 | Out-Null
        }
        catch {
            if ($_.Exception.Response.StatusCode.value__ -ne 404) { throw }
        }
    }

    Test-Step 'Receipt settings API' {
        $auth = Invoke-RestMethod "$Api/api/auth/login" -Method POST -ContentType 'application/json' `
            -Body (@{ username = $AdminUser; password = $AdminPass; tenantCode = $TenantCode } | ConvertTo-Json)
        $h = @{ Authorization = "Bearer $($auth.accessToken)" }
        Invoke-RestMethod "$Api/api/sales/settings/receipt" -Headers $h -TimeoutSec 20 | Out-Null
    }
}
else {
    Write-Host "[INFO] Bo qua test admin auth - truyen -TenantCode -AdminUser -AdminPass de test day du" -ForegroundColor DarkGray
}

Write-Host "`n=== Ket qua: $passed OK, $($failed.Count) FAIL, $($warn.Count) SKIP ===" -ForegroundColor Cyan
if ($failed.Count -gt 0) {
    Write-Host "FAIL: $($failed -join ', ')" -ForegroundColor Red
    exit 1
}

