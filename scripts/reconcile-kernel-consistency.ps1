# Reconcile kernel dual-write / party consistency (P0.5)
param(
    [string]$ConnectionString = $env:KitPlatform_DB
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$SqlFile = Join-Path $Root "scripts\reconcile-kernel-consistency.sql"

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
if (-not $psql) {
    Write-Host "psql not found" -ForegroundColor Red
    exit 1
}

Write-Host "=== Reconcile kernel consistency ===" -ForegroundColor Cyan
& $psql $ConnectionString -v ON_ERROR_STOP=1 -f $SqlFile
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$missingParty = & $psql $ConnectionString -t -A -c @"
SELECT COUNT(*)::text FROM public.customers c
WHERE c.deleted_at IS NULL AND c.party_id IS NULL
"@
$missingOutbox = & $psql $ConnectionString -t -A -c @"
SELECT COUNT(*)::text FROM public.platform_events pe
WHERE NOT EXISTS (
    SELECT 1 FROM kit_event.event_outbox eo WHERE eo.legacy_platform_event_id = pe.id
)
"@
$missingIntegrationOutbox = & $psql $ConnectionString -t -A -c @"
SELECT COUNT(*)::text FROM public.integration_outbox io
WHERE NOT EXISTS (
    SELECT 1 FROM kit_event.event_outbox eo WHERE eo.legacy_outbox_id = io.id
)
"@

Write-Host ""
Write-Host "customers_missing_party: $missingParty" -ForegroundColor $(if ([int]$missingParty -eq 0) { 'Green' } else { 'Yellow' })
Write-Host "platform_events_missing_outbox: $missingOutbox" -ForegroundColor $(if ([int]$missingOutbox -eq 0) { 'Green' } else { 'Yellow' })
Write-Host "integration_outbox_missing_kernel: $missingIntegrationOutbox" -ForegroundColor $(if ([int]$missingIntegrationOutbox -eq 0) { 'Green' } else { 'Yellow' })

if ([int]$missingParty -gt 0 -or [int]$missingOutbox -gt 0 -or [int]$missingIntegrationOutbox -gt 0) {
    Write-Host "Drift detected - run migration 079 backfill or investigate dual-write paths." -ForegroundColor Yellow
    exit 2
}

Write-Host "All critical consistency checks passed." -ForegroundColor Green

