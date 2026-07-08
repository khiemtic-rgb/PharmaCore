param(
    [string]$ConnectionString = "postgresql://kitplatform:kitplatform_dev_2026@localhost:5432/kitplatform"
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$MigrationFile = Join-Path $Root "migrations\070_assessment_pharmacy_v1_vietnamese.sql"

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
    Write-Host '[CANH BAO] Khong tim thay psql — bo qua migration 070.' -ForegroundColor Yellow
    exit 0
}

if (-not (Test-Path $MigrationFile)) {
    Write-Host "[CANH BAO] Thieu migration: $MigrationFile" -ForegroundColor Yellow
    exit 0
}

Write-Host ">> Assessment i18n: 070_assessment_pharmacy_v1_vietnamese.sql" -ForegroundColor Yellow
& $psql $ConnectionString -v ON_ERROR_STOP=1 -f $MigrationFile
if ($LASTEXITCODE -ne 0) {
    Write-Host "[LOI] Migration 070 that bai." -ForegroundColor Red
    exit $LASTEXITCODE
}

Write-Host "[OK] Migration 070 applied." -ForegroundColor Green

