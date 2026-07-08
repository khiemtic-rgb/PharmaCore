param(
    [string]$ConnectionString = "postgresql://kitplatform:kitplatform_dev_2026@localhost:5432/kitplatform"
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$MigrationFile = Join-Path $Root "migrations\074_kit_common_storage_party.sql"

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
    Write-Host '[CANH BAO] Khong tim thay psql — bo qua migration 074 (common/storage/party).' -ForegroundColor Yellow
    exit 0
}

if (-not (Test-Path $MigrationFile)) {
    Write-Host "[CANH BAO] Thieu migration: $MigrationFile" -ForegroundColor Yellow
    exit 0
}

Write-Host ">> KIT Platform kernel Phase 3: 074_kit_common_storage_party.sql" -ForegroundColor Yellow
& $psql $ConnectionString -v ON_ERROR_STOP=1 -f $MigrationFile
if ($LASTEXITCODE -ne 0) {
    Write-Host "[LOI] Migration 074 that bai." -ForegroundColor Red
    exit $LASTEXITCODE
}

$existsCount = & $psql $ConnectionString -t -A -c "SELECT COUNT(*)::text FROM kit_core.kernel_table_registry WHERE registry_status = 'EXISTS'"
$parties = & $psql $ConnectionString -t -A -c "SELECT COUNT(*)::text FROM kit_common.party_party WHERE deleted_at IS NULL"
$phase = & $psql $ConnectionString -t -A -c "SELECT kernel_phase FROM kit_core.platform_kernel_version WHERE id = 1"
Write-Host "[OK] Migration 074 applied. Phase: $phase | EXISTS: $existsCount | Parties: $parties" -ForegroundColor Green

