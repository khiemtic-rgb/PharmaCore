# Deploy KAP stack: API + admin + assessment-web to Novixa VPS
param(
    [string]$SshTarget = "root@103.200.23.229",
    [string]$CredentialsFile = "E:\Maychu_VPS\tk.txt"
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$plink = "C:\Program Files\PuTTY\plink.exe"
$pscp = "C:\Program Files\PuTTY\pscp.exe"
$passLine = Get-Content $CredentialsFile | Where-Object { $_ -match '^Pass' } | Select-Object -First 1
$pass = ($passLine -replace '^Pass[^:]*:\s*', '').Trim()

$required = @(
    "publish\api\KitPlatform.Api.dll",
    "publish\admin\index.html",
    "publish\assessment-web\index.html"
)
foreach ($f in $required) {
    if (-not (Test-Path $f)) { throw "Missing $f - run deploy-production.ps1 first." }
}

$remote = "/tmp/kit-platform-kap-deploy"
Write-Host "=== Deploy KAP (API + admin + assessment-web) -> $SshTarget ===" -ForegroundColor Cyan

& $plink -batch -pw $pass $SshTarget "rm -rf $remote; mkdir -p $remote/api $remote/admin $remote/assessment-web"
& $pscp -batch -pw $pass -r "$root\publish\api" "${SshTarget}:${remote}/"
& $pscp -batch -pw $pass -r "$root\publish\admin" "${SshTarget}:${remote}/"
& $pscp -batch -pw $pass -r "$root\publish\assessment-web" "${SshTarget}:${remote}/"

$nginxSrc = Join-Path $root "deploy\ubuntu\nginx-kit-platform.conf"
$nginxTmp = Join-Path $env:TEMP "nginx-kit-platform.conf"
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($nginxTmp, [System.IO.File]::ReadAllText($nginxSrc), $utf8NoBom)
& $pscp -batch -pw $pass $nginxTmp "${SshTarget}:/tmp/nginx-kit-platform.conf"
$patchSh = Join-Path $root "deploy\ubuntu\patch-nginx-pdf-timeout.sh"
$patchTmp = Join-Path $env:TEMP "patch-nginx-pdf-timeout.sh"
$patchLf = [System.IO.File]::ReadAllText($patchSh) -replace "`r`n", "`n"
[System.IO.File]::WriteAllText($patchTmp, $patchLf, $utf8NoBom)
& $pscp -batch -pw $pass $patchTmp "${SshTarget}:/tmp/patch-nginx-pdf-timeout.sh"

$remoteCmd = "set -e; WEB=/var/www/kit-platform; rsync -a ${remote}/api/ `$WEB/api/; rsync -a --delete ${remote}/admin/ `$WEB/admin/; rsync -a --delete ${remote}/assessment-web/ `$WEB/assessment-web/; sed -i '1s/^\xEF\xBB\xBF//' /tmp/nginx-kit-platform.conf; if ! grep -q 'listen 443' /etc/nginx/sites-available/kit-platform 2>/dev/null; then cp /tmp/nginx-kit-platform.conf /etc/nginx/sites-available/kit-platform; certbot --nginx -d api.novixa.vn -d admin.novixa.vn -d app.novixa.vn -d pos.novixa.vn -d survey.novixa.vn --expand --non-interactive --agree-tos --redirect --cert-name api.novixa.vn 2>/dev/null || certbot --nginx -d api.novixa.vn -d admin.novixa.vn -d app.novixa.vn -d pos.novixa.vn -d survey.novixa.vn --expand --non-interactive --agree-tos --redirect; else if ! grep -q 'server_name survey.novixa.vn' /etc/nginx/sites-available/kit-platform; then cat /tmp/nginx-kit-platform.conf | sed -n '/# --- KAP public assessment/,/^}/p' >> /etc/nginx/sites-available/kit-platform; certbot --nginx -d api.novixa.vn -d admin.novixa.vn -d app.novixa.vn -d pos.novixa.vn -d survey.novixa.vn --expand --non-interactive --agree-tos --redirect --cert-name api.novixa.vn 2>/dev/null || true; fi; fi; bash /tmp/patch-nginx-pdf-timeout.sh || true; chown -R www-data:www-data `$WEB/admin `$WEB/assessment-web; systemctl restart kit-platform-api; sleep 2; nginx -t; systemctl reload nginx; curl -s -o /dev/null -w 'api:%{http_code}\n' https://api.novixa.vn/api/health; curl -s -o /dev/null -w 'survey:%{http_code}\n' https://survey.novixa.vn/ || true"

& $plink -batch -pw $pass $SshTarget $remoteCmd
Write-Host "KAP deploy done." -ForegroundColor Green
