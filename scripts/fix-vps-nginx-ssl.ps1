# Restore nginx SSL after accidental overwrite + apply PWA cache snippet (staff POS)
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

$remote = "/tmp/KitPlatform-nginx-fix"
& $plink -batch -pw $pass $SshTarget "mkdir -p $remote /etc/nginx/snippets"
& $pscp -batch -pw $pass "$root\deploy\ubuntu\nginx-staff-pwa-cache.conf" "${SshTarget}:/etc/nginx/snippets/staff-pwa-cache.conf"

$nginxSrc = Join-Path $root "deploy\ubuntu\nginx-kit-platform.conf"
$nginxTmp = Join-Path $env:TEMP "nginx-kit-platform.conf"
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($nginxTmp, [System.IO.File]::ReadAllText($nginxSrc), $utf8NoBom)
& $pscp -batch -pw $pass $nginxTmp "${SshTarget}:${remote}/nginx-kit-platform.conf"

$remoteCmd = "set -e; if [ -f /etc/nginx/sites-available/kit-platform.bak ]; then cp /etc/nginx/sites-available/kit-platform.bak /etc/nginx/sites-available/kit-platform; elif [ -f /etc/nginx/sites-enabled/kit-platform.bak ]; then cp /etc/nginx/sites-enabled/kit-platform.bak /etc/nginx/sites-available/kit-platform; else cp ${remote}/nginx-kit-platform.conf /etc/nginx/sites-available/kit-platform; fi; sed -i '1s/^\xEF\xBB\xBF//' /etc/nginx/sites-available/kit-platform; if ! grep -q 'server_name survey.novixa.vn' /etc/nginx/sites-available/kit-platform; then cat ${remote}/nginx-kit-platform.conf | sed -n '/# --- KAP public assessment/,/^}/p' >> /etc/nginx/sites-available/kit-platform; fi; if ! grep -q staff-pwa-cache /etc/nginx/sites-available/kit-platform; then sed -i '/server_name pos.novixa.vn;/a\    include /etc/nginx/snippets/staff-pwa-cache.conf;' /etc/nginx/sites-available/kit-platform; fi; certbot --nginx -d api.novixa.vn -d admin.novixa.vn -d app.novixa.vn -d pos.novixa.vn -d survey.novixa.vn --expand --non-interactive --agree-tos --redirect --cert-name api.novixa.vn 2>/dev/null || certbot --nginx -d api.novixa.vn -d admin.novixa.vn -d app.novixa.vn -d pos.novixa.vn -d survey.novixa.vn --expand --non-interactive --agree-tos --redirect; nginx -t; systemctl reload nginx; systemctl restart kit-platform-api || true; sleep 2; curl -s -o /dev/null -w 'survey:%{http_code}\n' https://survey.novixa.vn/; curl -s -o /dev/null -w 'api:%{http_code}\n' https://api.novixa.vn/api/health"

& $plink -batch -pw $pass $SshTarget $remoteCmd
Write-Host "Nginx SSL fix attempted." -ForegroundColor Green

