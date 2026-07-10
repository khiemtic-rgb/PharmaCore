# Deploy KAP channel stack: API + admin + assessment-web + partner-portal
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
    "publish\assessment-web\index.html",
    "publish\partner-portal\index.html"
)
foreach ($f in $required) {
    if (-not (Test-Path $f)) { throw "Missing $f - run deploy-production.ps1 first." }
}

$remote = "/tmp/kit-platform-kap-deploy"
Write-Host "=== Deploy KAP + Partner Portal -> $SshTarget ===" -ForegroundColor Cyan

& $plink -batch -pw $pass $SshTarget "rm -rf $remote; mkdir -p $remote/api $remote/admin $remote/assessment-web $remote/partner-portal"
& $pscp -batch -pw $pass -r "$root\publish\api" "${SshTarget}:${remote}/"
& $pscp -batch -pw $pass -r "$root\publish\admin" "${SshTarget}:${remote}/"
& $pscp -batch -pw $pass -r "$root\publish\assessment-web" "${SshTarget}:${remote}/"
& $pscp -batch -pw $pass -r "$root\publish\partner-portal" "${SshTarget}:${remote}/"

$nginxSrc = Join-Path $root "deploy\ubuntu\nginx-kit-platform.conf"
$nginxTmp = Join-Path $env:TEMP "nginx-kit-platform.conf"
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($nginxTmp, [System.IO.File]::ReadAllText($nginxSrc), $utf8NoBom)
& $pscp -batch -pw $pass $nginxTmp "${SshTarget}:/tmp/nginx-kit-platform.conf"

$migSrc = Join-Path $root "migrations\103_kap_partner_portal.sql"
& $pscp -batch -pw $pass $migSrc "${SshTarget}:/tmp/103_kap_partner_portal.sql"

$shBody = @'
#!/bin/bash
set -e
WEB=/var/www/kit-platform
rsync -a /tmp/kit-platform-kap-deploy/api/ $WEB/api/
rsync -a --delete /tmp/kit-platform-kap-deploy/admin/ $WEB/admin/
rsync -a --delete /tmp/kit-platform-kap-deploy/assessment-web/ $WEB/assessment-web/
mkdir -p $WEB/partner-portal
rsync -a --delete /tmp/kit-platform-kap-deploy/partner-portal/ $WEB/partner-portal/
sed -i '1s/^\xEF\xBB\xBF//' /tmp/nginx-kit-platform.conf
if ! grep -q 'server_name partner.novixa.vn' /etc/nginx/sites-available/kit-platform 2>/dev/null; then
  sed -n '/# --- KAP Partner/,/^}/p' /tmp/nginx-kit-platform.conf >> /etc/nginx/sites-available/kit-platform
  certbot --nginx -d partner.novixa.vn --expand --non-interactive --agree-tos --redirect --cert-name api.novixa.vn 2>/dev/null || certbot --nginx -d partner.novixa.vn --non-interactive --agree-tos --redirect || true
fi
chown -R www-data:www-data $WEB/admin $WEB/assessment-web $WEB/partner-portal
set -a
. /etc/kit-platform/api.env
set +a
export PGPASSWORD=$(python3 - <<'PY'
import os,re
c=os.environ.get("ConnectionStrings__Default","")
m=re.search(r"Password=([^;]+)", c)
print(m.group(1) if m else "")
PY
)
DBHOST=$(python3 - <<'PY'
import os,re
c=os.environ.get("ConnectionStrings__Default","")
m=re.search(r"Host=([^;]+)", c)
print(m.group(1) if m else "127.0.0.1")
PY
)
DBNAME=$(python3 - <<'PY'
import os,re
c=os.environ.get("ConnectionStrings__Default","")
m=re.search(r"Database=([^;]+)", c)
print(m.group(1) if m else "")
PY
)
DBUSER=$(python3 - <<'PY'
import os,re
c=os.environ.get("ConnectionStrings__Default","")
m=re.search(r"Username=([^;]+)", c)
print(m.group(1) if m else "")
PY
)
psql -h "$DBHOST" -U "$DBUSER" -d "$DBNAME" -v ON_ERROR_STOP=1 -f /tmp/103_kap_partner_portal.sql
systemctl restart kit-platform-api
sleep 2
nginx -t
systemctl reload nginx
curl -s -o /dev/null -w 'api:%{http_code}\n' https://api.novixa.vn/api/health
curl -s -o /dev/null -w 'partner:%{http_code}\n' https://partner.novixa.vn/ || true
'@

$shTmp = Join-Path $env:TEMP "deploy-kap-partner-remote.sh"
$shLf = $shBody -replace "`r`n", "`n" -replace "`r", "`n"
[System.IO.File]::WriteAllText($shTmp, $shLf, $utf8NoBom)
& $pscp -batch -pw $pass $shTmp "${SshTarget}:/tmp/deploy-kap-partner-remote.sh"
& $plink -batch -pw $pass $SshTarget "bash /tmp/deploy-kap-partner-remote.sh"
Write-Host "KAP + Partner Portal deploy done." -ForegroundColor Green
