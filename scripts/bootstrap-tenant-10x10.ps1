<#
.SYNOPSIS
  Quy trinh 10x10 buoc 3+4: chi nhanh + kho + nhan vien thu ngan.

.EXAMPLE
  .\scripts\bootstrap-tenant-10x10.ps1
  .\scripts\bootstrap-tenant-10x10.ps1 -BranchCount 10 -StartIndex 2 -TenantCode DEMO_PHARMACY
#>
param(
    [string]$Base = "http://localhost:5290",
    [string]$TenantCode = "DEMO_PHARMACY",
    [string]$AdminUsername = "admin",
    [string]$AdminPassword = "Admin@123",
    [int]$BranchCount = 10,
    [int]$StartIndex = 2,
    [string]$StaffPassword = "Quay@Branch1",
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"
$here = $PSScriptRoot

$branchArgs = @{
    Base           = $Base
    TenantCode     = $TenantCode
    AdminUsername  = $AdminUsername
    AdminPassword  = $AdminPassword
    BranchCount    = $BranchCount
    StartIndex     = $StartIndex
}
if ($DryRun) { $branchArgs.DryRun = $true }

Write-Host "=== Bootstrap 10x10: branches ===" -ForegroundColor Cyan
& (Join-Path $here "bootstrap-tenant-branches.ps1") @branchArgs
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$staffArgs = @{
    Base           = $Base
    TenantCode     = $TenantCode
    AdminUsername  = $AdminUsername
    AdminPassword  = $AdminPassword
    StaffPassword  = $StaffPassword
}
if ($DryRun) { $staffArgs.DryRun = $true }

Write-Host ""
Write-Host "=== Bootstrap 10x10: staff ===" -ForegroundColor Cyan
& (Join-Path $here "bootstrap-tenant-staff.ps1") @staffArgs
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ""
Write-Host "=== 10x10 bootstrap complete ===" -ForegroundColor Green
Write-Host "Chay: .\scripts\run-readiness-check.ps1 -StaffUat" -ForegroundColor Yellow
