# Rx-2 POS strict: signed portal Rx -> pos-load -> block bare Rx SKU sale
param(
    [string]$BaseUrl = 'http://localhost:5290',
    [string]$TenantCode = 'NT_XUANHOA',
    [string]$AdminUser = 'admin',
    [string]$AdminPassword = 'Admin@123'
)

$ErrorActionPreference = 'Stop'
$api = "$($BaseUrl.TrimEnd('/'))/api"
$passed = 0; $failed = @()

function Test-Step([string]$Name, [scriptblock]$Block) {
    try { & $Block; Write-Host "[OK] $Name" -ForegroundColor Green; $script:passed++ }
    catch { Write-Host "[FAIL] $Name - $($_.Exception.Message)" -ForegroundColor Red; $script:failed += $Name }
}

Write-Host "`n=== Rx-2 POS strict smoke ===" -ForegroundColor Cyan

$admin = Invoke-RestMethod "$api/auth/login" -Method POST -ContentType 'application/json' `
    -Body (@{ username = $AdminUser; password = $AdminPassword; tenantCode = $TenantCode } | ConvertTo-Json)
$adminH = @{ Authorization = "Bearer $($admin.accessToken)" }

Test-Step 'Rx enforcement strict' {
    $rx = Invoke-RestMethod "$api/pharmacy/rx/settings" -Headers $adminH
    if ($rx.enforcementMode -ne 'strict') { throw "mode=$($rx.enforcementMode)" }
}

Test-Step 'Find signed portal Rx' {
    $uri = "$api/pharmacy/prescriptions?status=signed" + '&pageSize=20'
    $list = Invoke-RestMethod $uri -Headers $adminH
    $script:rx = $list.items | Where-Object { $_.source -eq 'prescriber_portal' } | Select-Object -First 1
    if (-not $script:rx) { throw 'no signed prescriber_portal Rx - run smoke-rx2-portal.ps1 first' }
}

Test-Step 'POS load signed Rx' {
    $whResp = Invoke-RestMethod "$api/inventory/warehouses" -Headers $adminH
$whList = if ($whResp -is [System.Array]) { $whResp } elseif ($whResp.items) { $whResp.items } else { @($whResp) }
$wh = $whList[0].id
    $script:posLoad = Invoke-RestMethod "$api/pharmacy/prescriptions/$($script:rx.id)/pos-load?warehouseId=$wh" -Headers $adminH
    if ($script:posLoad.lines.Count -lt 1) { throw 'no lines' }
    if ($script:posLoad.status -notin @('signed', 'verified', 'partially_dispensed')) { throw "status=$($script:posLoad.status)" }
}

Test-Step 'Strict blocks Rx SKU without prescription' {
    $line = $script:posLoad.lines | Where-Object {
        $_.lineDispensingClass -in @('prescription', 'controlled')
    } | Select-Object -First 1
    if (-not $line) {
        Write-Host '       skip: no Rx-class line on portal prescription' -ForegroundColor Yellow
        return
    }
    $whResp = Invoke-RestMethod "$api/inventory/warehouses" -Headers $adminH
$whList = if ($whResp -is [System.Array]) { $whResp } elseif ($whResp.items) { $whResp.items } else { @($whResp) }
$wh = $whList[0].id
    $body = @{
        warehouseId = $wh
        priceType = 1
        saveAsDraft = $true
        items = @(@{
            productId = $line.productId
            productUnitId = $line.productUnitId
            quantity = 1
        })
    } | ConvertTo-Json -Depth 6
    try {
        Invoke-RestMethod "$api/sales/orders" -Method POST -ContentType 'application/json' -Headers $adminH -Body $body | Out-Null
        throw 'expected 400'
    }
    catch {
        if ($_.Exception.Response.StatusCode.value__ -ne 400) { throw $_ }
    }
}

Test-Step 'Draft sale with prescription id' {
    $line = $script:posLoad.lines[0]
    $whResp = Invoke-RestMethod "$api/inventory/warehouses" -Headers $adminH
$whList = if ($whResp -is [System.Array]) { $whResp } elseif ($whResp.items) { $whResp.items } else { @($whResp) }
$wh = $whList[0].id
    $body = @{
        warehouseId = $wh
        priceType = 1
        saveAsDraft = $true
        prescriptionId = $script:rx.id
        items = @(@{
            productId = $line.productId
            productUnitId = $line.productUnitId
            quantity = 1
            prescriptionLineId = $line.prescriptionLineId
        })
    } | ConvertTo-Json -Depth 6
    $draft = Invoke-RestMethod "$api/sales/orders" -Method POST -ContentType 'application/json' -Headers $adminH -Body $body
    if (-not $draft.id) { throw 'no draft id' }
}

Write-Host "`n=== POS strict: $passed passed, $($failed.Count) failed ===" -ForegroundColor $(if ($failed.Count -eq 0) { 'Green' } else { 'Red' })
if ($failed.Count -gt 0) { exit 1 }
