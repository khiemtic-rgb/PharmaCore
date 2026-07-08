# Tao DB local kitplatform (clone tu pharmacore neu co, khong thi migrate tu dau).
# Usage:
#   .\scripts\setup-kitplatform-local.ps1 -PostgresPassword <postgres_superuser_password>
#   $env:KITPLATFORM_POSTGRES_PASSWORD='...'; .\scripts\setup-kitplatform-local.ps1
param(
    [string]$PostgresPassword = $env:KITPLATFORM_POSTGRES_PASSWORD,
    [switch]$FreshMigrate
)

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
$psql = @(
    'C:\Program Files\PostgreSQL\18\bin\psql.exe',
    'C:\Program Files\PostgreSQL\17\bin\psql.exe',
    'C:\Program Files\PostgreSQL\16\bin\psql.exe'
) | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $psql) { throw 'Khong tim thay psql.exe' }

if (-not $PostgresPassword) {
    Write-Host '[LOI] Can mat khau postgres superuser.' -ForegroundColor Red
    Write-Host '  .\scripts\setup-kitplatform-local.ps1 -PostgresPassword <mat_khau>' -ForegroundColor Yellow
    Write-Host '  hoac dat bien KITPLATFORM_POSTGRES_PASSWORD' -ForegroundColor Yellow
    exit 1
}

$env:PGPASSWORD = $PostgresPassword
Write-Host '=== KitPlatform local DB: kitplatform ===' -ForegroundColor Cyan

& $psql -U postgres -h localhost -d postgres -v ON_ERROR_STOP=1 -f (Join-Path $Root 'migrations\000_setup_database.sql')

$kitExists = & $psql -U postgres -h localhost -d postgres -t -A -c "SELECT 1 FROM pg_database WHERE datname='kitplatform'"
$pharmaExists = & $psql -U postgres -h localhost -d postgres -t -A -c "SELECT 1 FROM pg_database WHERE datname='pharmacore'"

if ($kitExists -eq '1' -and -not $FreshMigrate) {
    $tables = & $psql -U kitplatform -h localhost -d kitplatform -t -A -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'"
    if ([int]$tables -gt 5) {
        Write-Host "[OK] Database kitplatform da co ($tables bang public)." -ForegroundColor Green
        Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
        exit 0
    }
}

if ($pharmaExists -eq '1' -and -not $FreshMigrate) {
    Write-Host '>> Clone pharmacore -> kitplatform (giu du lieu dev)...' -ForegroundColor Yellow
    & $psql -U postgres -h localhost -d postgres -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS kitplatform;"
    & $psql -U postgres -h localhost -d postgres -v ON_ERROR_STOP=1 -c "CREATE DATABASE kitplatform OWNER kitplatform TEMPLATE pharmacore;"
    Write-Host '[OK] Da clone kitplatform tu pharmacore.' -ForegroundColor Green
    Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
    exit 0
}

Write-Host '>> Chay setup-and-migrate (DB moi)...' -ForegroundColor Yellow
Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
& (Join-Path $PSScriptRoot 'setup-and-migrate.ps1') -PostgresPassword $PostgresPassword
exit $LASTEXITCODE
