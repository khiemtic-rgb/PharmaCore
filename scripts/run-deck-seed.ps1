param(
    [string]$ConnectionString = "postgresql://kitplatform:kitplatform_dev_2026@localhost:5432/kitplatform"
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$Seed = Join-Path $Root "migrations\seed\004_deck_rich_demo.sql"

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
    Write-Host "[LOI] Khong tim thay psql. Cai PostgreSQL hoac them psql vao PATH." -ForegroundColor Red
    exit 1
}

Write-Host ">> Novixa deck rich demo seed" -ForegroundColor Cyan
& $psql $ConnectionString -v ON_ERROR_STOP=1 -f $Seed
Write-Host "=== XONG! Chay lai admin + chup screenshot deck ===" -ForegroundColor Green

