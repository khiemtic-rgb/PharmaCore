# Smoke Success EP03 AC4 — by-employee loss reports
param(
    [string]$BaseUrl = "http://localhost:5290",
    [string]$Tenant = "NT_XUANHOA",
    [string]$User = "admin",
    [string]$Pass = "Admin@123"
)

$ErrorActionPreference = "Stop"
Write-Host "`n=== Loss by-employee reports smoke ($Tenant @ $BaseUrl) ===" -ForegroundColor Cyan

$auth = Invoke-RestMethod "$BaseUrl/api/auth/login" -Method POST -ContentType "application/json" `
    -Body (@{ username = $User; password = $Pass; tenantCode = $Tenant } | ConvertTo-Json)
$h = @{ Authorization = "Bearer $($auth.accessToken)" }

$r = Invoke-RestMethod "$BaseUrl/api/success/loss/reports/by-employee" -Headers $h
if ($null -eq $r.fromUtc -or $null -eq $r.toUtc) { throw "date range missing" }
if ($null -eq $r.cancellations) { throw "cancellations missing" }
if ($null -eq $r.discounts) { throw "discounts missing" }
if ($null -eq $r.adjustments) { throw "adjustments missing" }
if (-not $r.attributionNotes) { throw "attributionNotes missing" }

# EP01/AC2 still present
$cockpit = Invoke-RestMethod "$BaseUrl/api/success/owner-cockpit" -Headers $h
if ($null -eq $cockpit.riskStrip) { throw "riskStrip regression" }
$cash = Invoke-RestMethod "$BaseUrl/api/success/loss/cash-variance" -Headers $h
if ($null -eq $cash.shifts) { throw "cash-variance regression" }

Write-Host "[OK] range $($r.fromUtc) -> $($r.toUtc)" -ForegroundColor Green
Write-Host "[OK] cancelRows=$($r.cancellations.Count) discountRows=$($r.discounts.Count) adjustRows=$($r.adjustments.Count)" -ForegroundColor Green
Write-Host "`n=== Loss by-employee reports smoke PASS ===" -ForegroundColor Green
