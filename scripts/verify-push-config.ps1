<#
.SYNOPSIS
  Kiểm tra API đã cấu hình VAPID và push worker.

.EXAMPLE
  .\scripts\verify-push-config.ps1
  .\scripts\verify-push-config.ps1 -BaseUrl "https://api.nhathuoc.vn"
#>
param(
    [string]$BaseUrl = "http://localhost:5290",
    [string]$Phone = "0909123456",
    [string]$TenantCode = "DEMO_PHARMACY",
    [string]$Otp = "000000"
)

$ErrorActionPreference = "Stop"
$base = $BaseUrl.TrimEnd("/")

Write-Host "=== Verify Customer App Push ===" -ForegroundColor Cyan
Write-Host "API: $base"

# Login
$otpBody = @{ phone = $Phone; tenantCode = $TenantCode } | ConvertTo-Json
Invoke-RestMethod "$base/api/customer-app/auth/request-otp" -Method Post -Body $otpBody -ContentType "application/json" | Out-Null
$loginBody = @{ phone = $Phone; code = $Otp; tenantCode = $TenantCode } | ConvertTo-Json
$login = Invoke-RestMethod "$base/api/customer-app/auth/verify-otp" -Method Post -Body $loginBody -ContentType "application/json"
$token = $login.accessToken
$h = @{ Authorization = "Bearer $token" }

$status = Invoke-RestMethod "$base/api/customer-app/push/status" -Headers $h
Write-Host "Push supported (API): $($status.supported)" -ForegroundColor $(if ($status.supported) { "Green" } else { "Red" })
Write-Host "Public key length: $($status.publicKey.Length)" -ForegroundColor Gray
Write-Host "Device subscribed: $($status.subscribed) (count=$($status.subscriptionCount))" -ForegroundColor Gray

if (-not $status.supported -or -not $status.publicKey) {
    Write-Host ""
    Write-Host "[FAIL] Chưa cấu hình CustomerAppPush:PublicKey/PrivateKey hoặc Enabled=false." -ForegroundColor Red
    Write-Host "Chạy: .\scripts\generate-vapid-keys.ps1 rồi set env và restart API." -ForegroundColor Yellow
    exit 1
}

if ($status.publicKey.Length -lt 80) {
    Write-Host "[WARN] Public key ngắn bất thường — kiểm tra cặp key khớp." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "[OK] VAPID sẵn sàng. Bật push trên app: Tài khoản → Thông báo push + đồng ý nhắc chăm sóc." -ForegroundColor Green
Write-Host "Production: HTTPS bắt buộc (PWA + Service Worker). Xem docs\customer-app-push-pilot.md" -ForegroundColor Cyan
