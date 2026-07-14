# Smoke Success P2-02 Shift Checklist
# Usage: .\scripts\smoke-success-shift-checklist-local.ps1
param(
    [string]$BaseUrl = "http://localhost:5290",
    [string]$Tenant = "NT_XUANHOA",
    [string]$User = "admin",
    [string]$Pass = "Admin@123"
)

$ErrorActionPreference = "Stop"
Write-Host "`n=== Shift checklist smoke ($Tenant @ $BaseUrl) ===" -ForegroundColor Cyan

$auth = Invoke-RestMethod "$BaseUrl/api/auth/login" -Method POST -ContentType "application/json" `
    -Body (@{ username = $User; password = $Pass; tenantCode = $Tenant } | ConvertTo-Json)
$h = @{ Authorization = "Bearer $($auth.accessToken)" }

$today = Invoke-RestMethod "$BaseUrl/api/success/shift-checklist/today" -Headers $h
if (-not $today.branchId) { throw "branchId missing" }
$branchId = $today.branchId
Write-Host "[OK] businessDate=$($today.businessDate) branch=$branchId" -ForegroundColor Green

$open = Invoke-RestMethod "$BaseUrl/api/success/shift-checklist/runs" -Method POST -Headers $h `
    -ContentType "application/json" -Body (@{ branchId = $branchId; kind = "open" } | ConvertTo-Json)
if (-not $open.items -or $open.items.Count -lt 1) { throw "open items missing" }

$item = $open.items | Where-Object { $_.isRequired } | Select-Object -First 1
if (-not $item) { throw "no required item" }
$open = Invoke-RestMethod "$BaseUrl/api/success/shift-checklist/runs/$($open.id)/items/$($item.id)" `
    -Method PUT -Headers $h -ContentType "application/json" -Body (@{ checked = $true } | ConvertTo-Json)
if (-not ($open.items | Where-Object { $_.id -eq $item.id }).isChecked) { throw "item not checked" }

# Tick all required then complete
foreach ($i in ($open.items | Where-Object { $_.isRequired -and -not $_.isChecked })) {
    $open = Invoke-RestMethod "$BaseUrl/api/success/shift-checklist/runs/$($open.id)/items/$($i.id)" `
        -Method PUT -Headers $h -ContentType "application/json" -Body (@{ checked = $true } | ConvertTo-Json)
}
$done = Invoke-RestMethod "$BaseUrl/api/success/shift-checklist/runs/$($open.id)/complete" `
    -Method POST -Headers $h
if ($done.status -ne "completed") { throw "status=$($done.status)" }

$today2 = Invoke-RestMethod "$BaseUrl/api/success/shift-checklist/today?branchId=$branchId" -Headers $h
if ($today2.open.status -ne "completed") { throw "today open not completed" }

Write-Host "[OK] open checklist completed ($($done.items.Count) items)" -ForegroundColor Green
Write-Host "`n=== Shift checklist smoke PASS ===" -ForegroundColor Green
Write-Host "Admin: http://localhost:5173/success/shift-checklist ($Tenant)"
