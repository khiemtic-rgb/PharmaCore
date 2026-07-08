# Deploy OTP fix to Novixa VPS (stub + API DLL)
param(
    [string]$Host = "root@103.200.23.229",
    [string]$Root = "E:\KitPlatform"
)

$ErrorActionPreference = "Stop"
Set-Location $Root

Write-Host "Building API Release..."
dotnet publish src/KitPlatform.Api/KitPlatform.Api.csproj -c Release -o .tmp/api-otp-fix --no-self-contained | Out-Null

Write-Host "Uploading sms-otp-stub.py..."
scp deploy/ubuntu/sms-otp-stub.py "${Host}:/opt/kit-platform/sms-otp-stub.py"

Write-Host "Uploading KitPlatform.Infrastructure.dll..."
scp .tmp/api-otp-fix/KitPlatform.Infrastructure.dll "${Host}:/var/www/kit-platform/api/"

Write-Host "Restarting services on VPS..."
ssh $Host @'
python3 -m py_compile /opt/kit-platform/sms-otp-stub.py && echo stub-ok || echo stub-fail
systemctl restart kit-platform-sms-stub kit-platform-api
sleep 2
systemctl is-active kit-platform-sms-stub kit-platform-api
grep -E "CustomerAppSms__" /etc/kit-platform/api.env
'@

Write-Host ""
Write-Host "Test OTP request (replace tenant if needed):"
Write-Host '  curl -s -X POST https://api.novixa.vn/api/customer-app/auth/request-otp -H "Content-Type: application/json" -d ''{"tenantCode":"NT_XUANHOA","phone":"0984660399"}'''
Write-Host ""
Write-Host "Then check logs:"
Write-Host "  journalctl -u kit-platform-sms-stub -n 10 --no-pager"
Write-Host "  journalctl -u kit-platform-api -n 20 --no-pager | grep -i otp"

