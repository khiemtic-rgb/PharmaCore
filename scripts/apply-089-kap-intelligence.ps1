# Apply KAP Decision Intelligence migrations (089 schema + 090 seed)
param(
    [string]$ConnectionString = $env:DATABASE_URL
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$Psql = Get-Command psql -ErrorAction SilentlyContinue

if (-not $Psql) {
    Write-Host '[CANH BAO] Khong tim thay psql — bo qua migration 089/090.' -ForegroundColor Yellow
    exit 0
}

if (-not $ConnectionString) {
    Write-Host '[CANH BAO] Thieu ConnectionString / DATABASE_URL.' -ForegroundColor Yellow
    exit 0
}

foreach ($file in @(
    "089_kap_decision_intelligence_schema.sql",
    "090_kap_pharmacy_intelligence_seed.sql"
)) {
    $path = Join-Path $Root "migrations\$file"
    if (-not (Test-Path $path)) { throw "Missing $path" }
    Write-Host ">> KAP Intelligence: $file" -ForegroundColor Yellow
    & $Psql.Source $ConnectionString -v ON_ERROR_STOP=1 -f $path
}

Write-Host "KAP Decision Intelligence migrations applied." -ForegroundColor Green
