# Deploy staff-app only to Novixa VPS (no API restart required)
param(
    [string]$SshTarget = "root@103.200.23.229",
    [string]$CredentialsFile = "E:\Maychu_VPS\tk.txt"
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$plink = "C:\Program Files\PuTTY\plink.exe"
$pscp = "C:\Program Files\PuTTY\pscp.exe"
$passLine = Get-Content $CredentialsFile | Where-Object { $_ -match '^Pass' } | Select-Object -First 1
$pass = ($passLine -replace '^Pass[^:]*:\s*', '').Trim()

if (-not (Test-Path "$root\publish\staff-app\index.html")) {
    throw "Missing publish/staff-app. Build staff-app first."
}

$remote = "/tmp/kit-platform-staff-deploy"
Write-Host "=== Deploy staff-app -> $SshTarget ===" -ForegroundColor Cyan

& $plink -batch -pw $pass $SshTarget "rm -rf $remote; mkdir -p $remote/staff-app /etc/nginx/snippets"
& $pscp -batch -pw $pass -r "$root\publish\staff-app" "${SshTarget}:${remote}/"
& $pscp -batch -pw $pass "$root\deploy\ubuntu\nginx-staff-pwa-cache.conf" "${SshTarget}:/etc/nginx/snippets/staff-pwa-cache.conf"

$remoteCmd = "set -e; WEB=/var/www/kit-platform; rsync -a --delete /tmp/kit-platform-staff-deploy/staff-app/ `$WEB/staff-app/; chown -R www-data:www-data `$WEB/staff-app; if ! grep -q staff-pwa-cache /etc/nginx/sites-available/kit-platform; then sed -i '/server_name pos.novixa.vn;/a\    include /etc/nginx/snippets/staff-pwa-cache.conf;' /etc/nginx/sites-available/kit-platform; fi; nginx -t; systemctl reload nginx; curl -s https://pos.novixa.vn/version.json; echo; curl -s https://pos.novixa.vn/ | head -c 220; echo"

& $plink -batch -pw $pass $SshTarget $remoteCmd
Write-Host "Staff-app deploy done." -ForegroundColor Green

