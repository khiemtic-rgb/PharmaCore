# Apply migration 078 — Pack 2 Clinic + CRM
param(
    [string]$ConnectionString = $env:KitPlatform_DB
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$Migration = Join-Path $Root "migrations\078_pack_clinic_crm.sql"

if (-not $ConnectionString) {
    Write-Host "Set KitPlatform_DB or pass -ConnectionString" -ForegroundColor Red
    exit 1
}

$psql = Get-Command psql -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source
if (-not $psql) {
    Write-Host "psql not found" -ForegroundColor Red
    exit 1
}

Write-Host ">> 078_pack_clinic_crm.sql" -ForegroundColor Yellow
& $psql $ConnectionString -v ON_ERROR_STOP=1 -f $Migration
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Host "Done." -ForegroundColor Green

