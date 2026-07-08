# Upload publish/ + migrations + deploy scripts lên VPS Novixa
# Usage: .\scripts\upload-to-vps.ps1
#        .\scripts\upload-to-vps.ps1 -Host root@103.200.23.229
param(
    [string]$SshTarget = "root@103.200.23.229",
    [string]$Root = "E:\KitPlatform"
)

$ErrorActionPreference = "Stop"
Set-Location $Root

$required = @(
    "publish\api\KitPlatform.Api.dll",
    "publish\admin\index.html",
    "publish\customer-app\index.html",
    "publish\staff-app\index.html",
    "migrations\001_extensions.sql",
    "deploy\ubuntu\bootstrap-vps.sh"
)
foreach ($f in $required) {
    if (-not (Test-Path $f)) {
        Write-Host "[LOI] Thieu: $f - chay deploy-production.ps1 truoc." -ForegroundColor Red
        exit 1
    }
}

Write-Host "=== Upload KitPlatform -> $SshTarget ===" -ForegroundColor Cyan
ssh $SshTarget "mkdir -p /tmp/kit-platform-upload"

scp -r publish/api publish/admin publish/customer-app publish/staff-app "${SshTarget}:/tmp/kit-platform-upload/"
scp -r migrations deploy "${SshTarget}:/tmp/kit-platform-upload/"
if (Test-Path "docs/novixa-production.env.example") {
    scp docs/novixa-production.env.example "${SshTarget}:/tmp/kit-platform-upload/"
}

Write-Host "`nDone. Tren VPS chay:" -ForegroundColor Green
Write-Host "  bash /tmp/kit-platform-upload/deploy/ubuntu/bootstrap-vps.sh" -ForegroundColor Yellow

