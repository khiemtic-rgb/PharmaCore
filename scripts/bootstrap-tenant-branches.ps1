<#
.SYNOPSIS
  Tao them chi nhanh + kho cho tenant da ton tai (scale 10x10).

.EXAMPLE
  .\scripts\bootstrap-tenant-branches.ps1 -BranchCount 10
  .\scripts\bootstrap-tenant-branches.ps1 -BranchCount 5 -StartIndex 2 -TenantCode DEMO_PHARMACY
#>
param(
    [string]$Base = "http://localhost:5290",
    [string]$TenantCode = "DEMO_PHARMACY",
    [string]$AdminUsername = "admin",
    [string]$AdminPassword = "Admin@123",
    [int]$BranchCount = 10,
    [int]$StartIndex = 2,
    [string]$BranchCodePrefix = "CN",
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

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

Write-Host "=== Bootstrap branches: $TenantCode ($BranchCount from index $StartIndex) ===" -ForegroundColor Cyan

$login = Invoke-Api -Method POST -Path "/api/auth/login" -Body @{
    username   = $AdminUsername
    password   = $AdminPassword
    tenantCode = $TenantCode
}
$token = $login.accessToken
if (-not $token) { throw "Admin login failed for tenant $TenantCode" }

$existing = @(Invoke-Api -Path "/api/system/branches" -Token $token)
$existingCodes = @($existing | ForEach-Object { $_.branchCode })
$created = 0
$skipped = 0

for ($i = 0; $i -lt $BranchCount; $i++) {
    $idx = $StartIndex + $i
    $code = "{0}{1:D2}" -f $BranchCodePrefix, $idx
    $whCode = "WH_$code"

    if ($existingCodes -contains $code) {
        Write-Host "[skip] Branch $code exists" -ForegroundColor DarkYellow
        $skipped++
        continue
    }

    if ($DryRun) {
        Write-Host "[dry-run] Would create $code + $whCode" -ForegroundColor Cyan
        $created++
        continue
    }

    $branch = Invoke-Api -Method POST -Path "/api/system/branches" -Token $token -Body @{
        branchCode   = $code
        branchName   = "Chi nhanh $code"
        address      = "Auto bootstrap"
        isHeadOffice = $false
        status       = 1
    }
    Invoke-Api -Method POST -Path "/api/inventory/warehouses" -Token $token -Body @{
        branchId      = $branch.id
        warehouseCode = $whCode
        warehouseName = "Kho $code"
        warehouseType = 1
        isDefault     = $false
        status        = 1
    } | Out-Null
    Write-Host "[ok] $code + $whCode" -ForegroundColor Green
    $created++
}

Write-Host "=== Done: created=$created skipped=$skipped ===" -ForegroundColor Green

