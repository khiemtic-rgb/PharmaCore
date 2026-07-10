# Rx-2 smoke against production/staging API (NT_XUANHOA pilot)
param(
    [string]$BaseUrl = 'https://api.novixa.vn',
    [string]$TenantCode = 'NT_XUANHOA',
    [string]$AdminUser = 'admin',
    [string]$AdminPassword = $env:RX_SMOKE_ADMIN_PASSWORD
)

$ErrorActionPreference = 'Stop'
if (-not $AdminPassword) {
    throw 'Set RX_SMOKE_ADMIN_PASSWORD env var (admin password for pilot tenant).'
}

$base = "$($BaseUrl.TrimEnd('/'))/api"
$passed = 0; $failed = @()

function Test-Step([string]$Name, [scriptblock]$Block) {
    try { & $Block; Write-Host "[OK] $Name" -ForegroundColor Green; $script:passed++ }
    catch { Write-Host "[FAIL] $Name - $($_.Exception.Message)" -ForegroundColor Red; $script:failed += $Name }
}

Write-Host "`n=== Rx-2 VPS smoke ($BaseUrl) ===" -ForegroundColor Cyan

Test-Step 'health/db' {
    $h = Invoke-RestMethod "$base/health/db" -TimeoutSec 20
    if ($h.status -ne 'ok') { throw "status=$($h.status)" }
}

Test-Step 'admin login' {
    $script:admin = Invoke-RestMethod "$base/auth/login" -Method POST -ContentType 'application/json' `
        -Body (@{ username = $AdminUser; password = $AdminPassword; tenantCode = $TenantCode } | ConvertTo-Json)
    if (-not $script:admin.accessToken) { throw 'no token' }
    $script:adminH = @{ Authorization = "Bearer $($script:admin.accessToken)" }
}

Test-Step 'rx settings strict' {
    $rx = Invoke-RestMethod "$base/pharmacy/rx/settings" -Headers $script:adminH
    if ($rx.enforcementMode -ne 'strict') { throw "enforcementMode=$($rx.enforcementMode)" }
}

Test-Step 'prescriber links API' {
    $links = Invoke-RestMethod "$base/pharmacy/prescribers/links" -Headers $script:adminH
    if ($null -eq $links) { throw 'null' }
}

Test-Step 'signed prescriptions list' {
    $uri = "$base/pharmacy/prescriptions?status=signed" + '&pageSize=5'
    $list = Invoke-RestMethod $uri -Headers $script:adminH
    if ($null -eq $list.items) { throw 'no items' }
}

Test-Step 'prescriber portal health (anonymous)' {
    $h = Invoke-RestMethod "$base/health" -TimeoutSec 10
    if ($h.status -ne 'ok') { throw $h.status }
}

Write-Host "`n=== VPS smoke: $passed passed, $($failed.Count) failed ===" -ForegroundColor $(if ($failed.Count -eq 0) { 'Green' } else { 'Red' })
if ($failed.Count -gt 0) { exit 1 }
