# VPS fresh start â€” wipe old PharmaCore deploy and bootstrap Kit Platform from scratch
# Usage:
#   .\scripts\vps-fresh-start.ps1 -SshTarget root@103.200.23.229
#   .\scripts\vps-fresh-start.ps1 -SshTarget root@103.200.23.229 -SkipWipe
param(
    [string]$SshTarget = "root@103.200.23.229",
    [string]$Root = "E:\KitPlatform",
    [string]$CertbotEmail = "care@novixa.vn",
    [switch]$SkipWipe,
    [switch]$SkipCertbot
)

$ErrorActionPreference = "Stop"
Set-Location $Root

Write-Host "=== Kit Platform â€” VPS fresh start ===" -ForegroundColor Cyan

# 1) Local build + publish
Write-Host "`n>> Build + publish..." -ForegroundColor Yellow
dotnet build KitPlatform.slnx -c Release
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

dotnet publish src/KitPlatform.Api/KitPlatform.Api.csproj -c Release -o ./publish/api
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

# Admin / apps â€” full production artifacts (API already published above; rebuild is fine)
if (Test-Path "scripts/deploy-production.ps1") {
    & powershell -File scripts/deploy-production.ps1 -ApiBaseUrl "https://api.novixa.vn" -UseExistingNodeModules
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

# 2) Local tests (module gate)
Write-Host "`n>> Tests..." -ForegroundColor Yellow
dotnet test tests/KitPlatform.Application.Tests/KitPlatform.Application.Tests.csproj -c Release --no-build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
dotnet test tests/KitPlatform.Platform.Tests/KitPlatform.Platform.Tests.csproj -c Release --no-build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
dotnet test tests/KitPlatform.Api.Tests/KitPlatform.Api.Tests.csproj -c Release
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

# 3) Optional VPS wipe
if (-not $SkipWipe) {
    Write-Host "`n>> Wipe old deploy on VPS..." -ForegroundColor Yellow
    $wipe = @'
set -e
systemctl stop kit-platform-api kit-platform-sms-stub pharmacore-api pharmacore-sms-stub 2>/dev/null || true
systemctl disable kit-platform-api kit-platform-sms-stub pharmacore-api pharmacore-sms-stub 2>/dev/null || true
rm -f /etc/systemd/system/kit-platform-api.service /etc/systemd/system/kit-platform-sms-stub.service
rm -f /etc/systemd/system/pharmacore-api.service /etc/systemd/system/pharmacore-sms-stub.service
systemctl daemon-reload
rm -rf /var/www/pharmacore /var/www/kit-platform
rm -rf /opt/pharmacore /opt/kit-platform
rm -rf /etc/pharmacore /etc/kit-platform
rm -rf /tmp/kit-platform-upload /tmp/pharmacore-upload
# Drop old DB roles if present (fresh novixa_prod)
sudo -u postgres psql -v ON_ERROR_STOP=0 <<'SQL'
DROP DATABASE IF EXISTS novixa_prod;
DROP ROLE IF EXISTS pharmacore;
DROP ROLE IF EXISTS kitplatform;
SQL
echo "VPS wiped."
'@
    ssh $SshTarget $wipe
}

# 4) Upload + bootstrap
Write-Host "`n>> Upload artifacts..." -ForegroundColor Yellow
& powershell -File scripts/upload-to-vps.ps1 -SshTarget $SshTarget -Root $Root

$envVars = "DOMAIN=novixa.vn"
if ($CertbotEmail) { $envVars += " CERTBOT_EMAIL=$CertbotEmail" }
if ($SkipCertbot) { $envVars += " SKIP_CERTBOT=1" }

Write-Host "`n>> Bootstrap on VPS..." -ForegroundColor Yellow
ssh $SshTarget "$envVars bash /tmp/kit-platform-upload/deploy/ubuntu/bootstrap-vps.sh"

Write-Host "`n=== Done. Verify: https://api.novixa.vn/api/health ===" -ForegroundColor Green

