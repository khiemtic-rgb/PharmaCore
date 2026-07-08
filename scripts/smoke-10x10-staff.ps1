<#
.SYNOPSIS
  UAT buoc 5: xac minh user thu ngan tung chi nhanh chi thay kho cua minh.

.EXAMPLE
  .\scripts\smoke-10x10-staff.ps1
  .\scripts\smoke-10x10-staff.ps1 -SampleCount 5
#>
param(
    [string]$Base = "http://localhost:5290",
    [string]$TenantCode = "DEMO_PHARMACY",
    [string]$AdminUsername = "admin",
    [string]$AdminPassword = "Admin@123",
    [string]$UserPrefix = "quay",
    [string]$StaffPassword = "Quay@Branch1",
    [int]$SampleCount = 3
)

$ErrorActionPreference = "Stop"
$results = @()

function Invoke-Api {
    param(
        [string]$Method = "GET",
        [string]$Path,
        [object]$Body = $null,
        [string]$Token = $null
    )
    $headers = @{ Accept = "application/json" }
    if ($Token) { $headers.Authorization = "Bearer $Token" }
    $uri = "$Base$Path"
    if ($Body) {
        $json = ($Body | ConvertTo-Json -Depth 10 -Compress)
        $resp = Invoke-WebRequest -Method $Method -Uri $uri -Headers $headers -ContentType "application/json" -Body $json -UseBasicParsing
    }
    else {
        $resp = Invoke-WebRequest -Method $Method -Uri $uri -Headers $headers -UseBasicParsing
    }
    if ([string]::IsNullOrWhiteSpace($resp.Content)) { return $null }
    return ($resp.Content | ConvertFrom-Json)
}

function Add-Result($Name, $Ok, $Detail) {
    $script:results += [pscustomobject]@{ Test = $Name; Ok = $Ok; Detail = $Detail }
    $color = if ($Ok) { "Green" } else { "Red" }
    $mark = if ($Ok) { "PASS" } else { "FAIL" }
    Write-Host "[$mark] $Name - $Detail" -ForegroundColor $color
}

Write-Host "=== Smoke 10x10 staff UAT ===" -ForegroundColor Cyan

$adminLogin = Invoke-Api -Method POST -Path "/api/auth/login" -Body @{
    username   = $AdminUsername
    password   = $AdminPassword
    tenantCode = $TenantCode
}
$adminToken = $adminLogin.accessToken
if (-not $adminToken) {
    Add-Result "Admin login" $false "failed"
    exit 1
}
Add-Result "Admin login" $true $TenantCode

$branches = @(Invoke-Api -Path "/api/system/branches" -Token $adminToken)
$allWh = @(Invoke-Api -Path "/api/inventory/warehouses" -Token $adminToken)
$tested = 0
$failed = 0

foreach ($branch in $branches) {
    if ($tested -ge $SampleCount) { break }
    $code = [string]$branch.branchCode
    $username = "{0}_{1}" -f $UserPrefix, ($code.ToLower())

    try {
        $login = Invoke-Api -Method POST -Path "/api/auth/login" -Body @{
            username   = $username
            password   = $StaffPassword
            tenantCode = $TenantCode
        }
    }
    catch {
        continue
    }
    if (-not $login.accessToken) { continue }

    $scopeWh = @(Invoke-Api -Path "/api/inventory/warehouses" -Token $login.accessToken)
    $onBranch = @($scopeWh | Where-Object { $_.branchId -eq $branch.id })
    $offBranch = @($scopeWh | Where-Object { $_.branchId -ne $branch.id })
    if ($onBranch.Count -eq 0) {
        Add-Result "Staff $username scoped" $false "branch $code has no warehouse"
        $failed++
        $tested++
        continue
    }
    $ok = ($offBranch.Count -eq 0)
    Add-Result "Staff $username scoped" $ok "own=$($onBranch.Count) foreign=$($offBranch.Count)"
    if (-not $ok) { $failed++ }
    $tested++
}

if ($tested -eq 0) {
    Add-Result "Staff samples found" $false "0 users - chay bootstrap-tenant-staff.ps1 truoc"
    exit 1
}
Add-Result "Staff samples tested" ($tested -ge 1) "count=$tested"

Write-Host ""
Write-Host "=== Summary ===" -ForegroundColor Cyan
$passed = @($results | Where-Object { $_.Ok }).Count
$fail = @($results | Where-Object { -not $_.Ok }).Count
Write-Host "Passed: $passed / $($results.Count)  Failed: $fail"
if ($fail -gt 0) { exit 1 }
exit 0

