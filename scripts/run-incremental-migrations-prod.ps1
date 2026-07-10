<#
.SYNOPSIS
  Apply pending production migrations only (uses public.kit_schema_migrations ledger).

.PARAMETER ConnectionString
  PostgreSQL URI for direct local/remote DB access.

.PARAMETER Remote
  Run incremental migrations on production VPS via SSH (default target root@103.200.23.229).

.EXAMPLE
  .\scripts\run-incremental-migrations-prod.ps1 -Remote

.EXAMPLE
  .\scripts\run-incremental-migrations-prod.ps1 -ConnectionString "postgresql://pharmacore:secret@localhost:5432/novixa_prod"
#>
param(
    [string]$ConnectionString,
    [switch]$Remote,
    [string]$SshTarget = "root@103.200.23.229",
    [string]$CredentialsFile = "E:\Maychu_VPS\tk.txt",
    [string]$Root = "E:\KitPlatform"
)

$ErrorActionPreference = "Stop"
Set-Location $Root

if ($Remote) {
    $plink = "C:\Program Files\PuTTY\plink.exe"
    $pscp = "C:\Program Files\PuTTY\pscp.exe"
    if (-not (Test-Path $plink)) { throw "plink.exe not found" }
    if (-not (Test-Path $pscp)) { throw "pscp.exe not found" }

    $passLine = Get-Content $CredentialsFile | Where-Object { $_ -match '^Pass' } | Select-Object -First 1
    if (-not $passLine) { throw "password not found in credentials file" }
    $pass = ($passLine -replace '^Pass[^:]*:\s*', '').Trim()

    $remoteDir = "/tmp/kitplatform-inc-mig"
    & $plink -batch -pw $pass $SshTarget "mkdir -p $remoteDir/migrations $remoteDir/deploy"
    & $pscp -batch -pw $pass -r "$Root\migrations" "${SshTarget}:${remoteDir}/"
    & $pscp -batch -pw $pass "$Root\deploy\ubuntu\run-incremental-migrations-prod.sh" "${SshTarget}:${remoteDir}/deploy/"
    & $pscp -batch -pw $pass "$Root\deploy\ubuntu\migration-files.prod.txt" "${SshTarget}:${remoteDir}/deploy/"

    $remoteCmd = @'
set -euo pipefail
REMOTE=/tmp/kitplatform-inc-mig
if [[ -f /etc/kit-platform/secrets.generated ]]; then source /etc/kit-platform/secrets.generated
elif [[ -f /etc/pharmacore/secrets.generated ]]; then source /etc/pharmacore/secrets.generated
else echo "No secrets.generated"; exit 1; fi
DB_USER=kitplatform; DB_NAME=novixa_prod
if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='kitplatform'" | grep -q 1; then DB_USER=pharmacore; fi
if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='novixa_prod'" | grep -q 1; then
  DB_NAME=$(grep -oP 'Database=\K[^;]+' /etc/kit-platform/api.env | head -n1)
  DB_USER=$(grep -oP 'Username=\K[^;]+' /etc/kit-platform/api.env | head -n1)
fi
CONN="postgresql://${DB_USER}:${DB_PASS}@127.0.0.1:5432/${DB_NAME}"
sed -i 's/\r$//' "$REMOTE/deploy/run-incremental-migrations-prod.sh"
chmod +x "$REMOTE/deploy/run-incremental-migrations-prod.sh"
MIGRATIONS_DIR="$REMOTE/migrations" MIGRATION_MANIFEST="$REMOTE/deploy/migration-files.prod.txt" bash "$REMOTE/deploy/run-incremental-migrations-prod.sh" "$CONN"
'@

    $tmpScript = Join-Path $env:TEMP "kitplatform-inc-mig-remote.sh"
    [IO.File]::WriteAllText($tmpScript, ($remoteCmd -replace "`r`n", "`n"), [Text.UTF8Encoding]::new($false))
    & $pscp -batch -pw $pass $tmpScript "${SshTarget}:${remoteDir}/run.sh"
    & $plink -batch -pw $pass $SshTarget "bash $remoteDir/run.sh"
    exit $LASTEXITCODE
}

if (-not $ConnectionString) {
    throw "Provide -ConnectionString or -Remote"
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
if (-not $psql) { throw "psql not found" }

$bash = Get-Command bash -ErrorAction SilentlyContinue
if (-not $bash) { throw "bash not found (Git Bash or WSL required for local incremental run)" }

$scriptPath = Join-Path $Root "deploy\ubuntu\run-incremental-migrations-prod.sh"
$manifestPath = Join-Path $Root "deploy\ubuntu\migration-files.prod.txt"
$migrationsPath = Join-Path $Root "migrations"

$env:MIGRATIONS_DIR = ($migrationsPath -replace '\\', '/')
$env:MIGRATION_MANIFEST = ($manifestPath -replace '\\', '/')
& bash $scriptPath $ConnectionString
