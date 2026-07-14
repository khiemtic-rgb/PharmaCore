# Smoke Success EP03 AC3 — cycle count status/suggestions/variance
param(
    [string]$BaseUrl = "http://localhost:5290",
    [string]$Tenant = "NT_XUANHOA",
    [string]$User = "admin",
    [string]$Pass = "Admin@123"
)

$ErrorActionPreference = "Stop"
Write-Host "`n=== Loss cycle-count smoke ($Tenant @ $BaseUrl) ===" -ForegroundColor Cyan

$auth = Invoke-RestMethod "$BaseUrl/api/auth/login" -Method POST -ContentType "application/json" `
    -Body (@{ username = $User; password = $Pass; tenantCode = $Tenant } | ConvertTo-Json)
$h = @{ Authorization = "Bearer $($auth.accessToken)" }

$status = Invoke-RestMethod "$BaseUrl/api/success/loss/cycle-count/status" -Headers $h
if ($null -eq $status.status) { throw "status missing" }
if ($null -eq $status.businessDate) { throw "businessDate missing" }

$variance = Invoke-RestMethod "$BaseUrl/api/success/loss/cycle-count/variance" -Headers $h
if ($null -eq $variance.items) { throw "variance items missing" }

$cockpit = Invoke-RestMethod "$BaseUrl/api/success/owner-cockpit" -Headers $h
if ($null -eq $cockpit.riskStrip.cycleCountStatusToday) {
    throw "cockpit riskStrip.cycleCountStatusToday missing"
}

$wh = Invoke-RestMethod "$BaseUrl/api/inventory/warehouses" -Headers $h
$first = @($wh) | Select-Object -First 1
if ($null -eq $first) { throw "no warehouse" }
$wid = $first.id
if (-not $wid) { $wid = $first.Id }

$sug = Invoke-RestMethod "$BaseUrl/api/success/loss/cycle-count/suggestions?warehouseId=$wid&limit=15" -Headers $h
if ($null -eq $sug.items) { throw "suggestions missing" }
if ($sug.items.Count -gt 20) { throw "suggestions over 20" }

Write-Host "[OK] status=$($status.status) cockpit=$($cockpit.riskStrip.cycleCountStatusToday) suggestions=$($sug.items.Count) varianceRows=$($variance.items.Count)" -ForegroundColor Green
Write-Host "`n=== Loss cycle-count smoke PASS ===" -ForegroundColor Green
