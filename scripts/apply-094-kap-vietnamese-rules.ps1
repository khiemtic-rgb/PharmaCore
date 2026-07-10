# Apply migration 094 — KAP Vietnamese rules + root cause fixes
param(
    [string]$ConnectionString = $env:DATABASE_URL
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot

if (-not $ConnectionString) {
    $ConnectionString = "postgresql://kitplatform@127.0.0.1:5432/novixa_prod"
}

$files = @("093_kap_vietnamese_seed.sql", "094_kap_vietnamese_rules.sql")
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

foreach ($file in $files) {
    $path = Join-Path $Root "migrations\$file"
    if (-not (Test-Path $path)) { throw "Missing $path" }
    Write-Host ">> Applying $file..." -ForegroundColor Yellow
    & $psql $ConnectionString -v ON_ERROR_STOP=1 -f $path
}

Write-Host "KAP Vietnamese migrations (093/094) applied." -ForegroundColor Green
