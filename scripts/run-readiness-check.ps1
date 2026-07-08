<#
.SYNOPSIS
  Kiem tra san sang trien khai multi-branch (10x10): migrate 045/046 + smoke test.

.EXAMPLE
  .\scripts\run-readiness-check.ps1
  .\scripts\run-readiness-check.ps1 -SkipMigrate
#>
param(
    [switch]$SkipMigrate,
    [switch]$SkipRestart,
    [switch]$StaffUat,
    [string]$ConnectionString = "postgresql://kitplatform:kitplatform_dev_2026@localhost:5432/kitplatform"
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot

Write-Host "=== KitPlatform readiness check (10x10) ===" -ForegroundColor Cyan

if (-not $SkipMigrate) {
    $psqlCandidates = @(
        "C:\Program Files\PostgreSQL\18\bin\psql.exe",
        "C:\Program Files\PostgreSQL\17\bin\psql.exe",
        "C:\Program Files\PostgreSQL\16\bin\psql.exe"
    )
    $psql = $psqlCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
    if (-not $psql) {
        $cmd = Get-Command psql -ErrorAction SilentlyContinue
        if ($cmd) { $psql = $cmd.Source }
    }
    if (-not $psql) {
        Write-Host "[WARN] psql not found - skip migration 045/046" -ForegroundColor Yellow
    }
    else {
        foreach ($migrationFile in @("045_scale_branch_readiness.sql", "046_chat_branch_scope.sql")) {
            $migration = Join-Path $Root "migrations\$migrationFile"
            if (Test-Path $migration) {
                Write-Host ">> Applying $migrationFile..." -ForegroundColor Yellow
                & $psql $ConnectionString -v ON_ERROR_STOP=1 -f $migration
                if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
            }
        }
    }
}

if (-not $SkipRestart) {
    Write-Host ">> Restart API..." -ForegroundColor Yellow
    & (Join-Path $PSScriptRoot "restart-api.ps1")
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

Write-Host ">> Smoke multi-branch..." -ForegroundColor Yellow
& (Join-Path $PSScriptRoot "smoke-multi-branch.ps1")
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

if ($StaffUat) {
    Write-Host ">> Smoke 10x10 staff UAT..." -ForegroundColor Yellow
    & (Join-Path $PSScriptRoot "smoke-10x10-staff.ps1")
    exit $LASTEXITCODE
}

exit 0

