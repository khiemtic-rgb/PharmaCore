# Deploy API + staff-app + admin hotfix to Novixa VPS
param(
    [string]$SshTarget = "root@103.200.23.229",
    [string]$CredentialsFile = "E:\Maychu_VPS\tk.txt"
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$plink = "C:\Program Files\PuTTY\plink.exe"
$pscp = "C:\Program Files\PuTTY\pscp.exe"
if (-not (Test-Path $plink)) { throw "plink.exe not found" }
if (-not (Test-Path $pscp)) { throw "pscp.exe not found" }

$passLine = Get-Content $CredentialsFile | Where-Object { $_ -match '^Pass' } | Select-Object -First 1
if (-not $passLine) { throw "password not found in credentials file" }
$pass = ($passLine -replace '^Pass[^:]*:\s*', '').Trim()

$required = @(
    "publish\api\KitPlatform.Api.dll",
    "publish\staff-app\index.html",
    "publish\admin\index.html"
)
foreach ($f in $required) {
    if (-not (Test-Path $f)) { throw "Missing $f - build before deploy." }
}

$remote = "/tmp/kit-platform-deploy-pos"
Write-Host "=== Deploy POS hotfix -> $SshTarget ===" -ForegroundColor Cyan

& $plink -batch -pw $pass $SshTarget "rm -rf $remote; mkdir -p $remote/api $remote/staff-app $remote/admin"
& $pscp -batch -pw $pass -r "$root\publish\api" "${SshTarget}:${remote}/"
& $pscp -batch -pw $pass -r "$root\publish\staff-app" "${SshTarget}:${remote}/"
& $pscp -batch -pw $pass -r "$root\publish\admin" "${SshTarget}:${remote}/"

$remoteCmd = "set -e; WEB=/var/www/kit-platform; rsync -a ${remote}/api/ `$WEB/api/; rsync -a --delete ${remote}/staff-app/ `$WEB/staff-app/; rsync -a --delete ${remote}/admin/ `$WEB/admin/; chown -R www-data:www-data `$WEB/staff-app `$WEB/admin; systemctl restart kit-platform-api; sleep 2; systemctl is-active kit-platform-api; curl -s -o /dev/null -w 'health:%{http_code}\n' https://api.novixa.vn/api/health; curl -s https://pos.novixa.vn/ | head -c 200; echo"

& $plink -batch -pw $pass $SshTarget $remoteCmd
Write-Host ""
Write-Host "Deploy done." -ForegroundColor Green

