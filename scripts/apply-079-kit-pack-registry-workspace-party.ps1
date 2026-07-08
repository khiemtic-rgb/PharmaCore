# Apply migration 079 — pack registry, workspace provision, party backfill
param(
    [string]$ConnectionString = $env:KitPlatform_DB
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$Migration = Join-Path $Root "migrations\079_kit_pack_registry_workspace_party_backfill.sql"

if (-not $ConnectionString) {
    $ConnectionString = "postgresql://kitplatform:kitplatform_dev_2026@localhost:5432/kitplatform"
}

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
if (-not $psql) { Write-Host "psql not found" -ForegroundColor Red; exit 1 }

Write-Host ">> 079_kit_pack_registry_workspace_party_backfill.sql" -ForegroundColor Yellow
& $psql $ConnectionString -v ON_ERROR_STOP=1 -f $Migration
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$packCount = & $psql $ConnectionString -t -A -c "SELECT COUNT(*)::text FROM kit_tenant.tenant_package WHERE package_code IN ('novixa_pharmacy','clinic_crm')"
$partyGap = & $psql $ConnectionString -t -A -c "SELECT COUNT(*)::text FROM customers WHERE deleted_at IS NULL AND party_id IS NULL"

Write-Host "tenant_packages (pharmacy+clinic): $packCount" -ForegroundColor Green
Write-Host "customers_missing_party: $partyGap" -ForegroundColor $(if ([int]$partyGap -eq 0) { 'Green' } else { 'Yellow' })
Write-Host "Done. Run: .\scripts\reconcile-kernel-consistency.ps1" -ForegroundColor Cyan

