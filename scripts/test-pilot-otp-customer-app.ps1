param(
    [string]$Base = 'http://localhost:5290',
    [string]$Phone = '0909123456',
    [string]$TenantCode = 'DEMO_PHARMACY'
)

$ErrorActionPreference = 'Stop'

function Assert([bool]$Condition, [string]$Message) {
    if (-not $Condition) { throw $Message }
}

Write-Host "`n=== Pilot OTP customer-app test ===" -ForegroundColor Cyan
Write-Host "Base: $Base | Phone: $Phone | Tenant: $TenantCode"

Write-Host "`n[1] request-otp..." -ForegroundColor Yellow
$otp = Invoke-RestMethod "$Base/api/customer-app/auth/request-otp" -Method POST -ContentType 'application/json' `
    -Body (@{ phone = $Phone; tenantCode = $TenantCode } | ConvertTo-Json)

$otp | ConvertTo-Json -Depth 5 | Write-Host
Assert ($otp.expiresInSeconds -gt 0) 'expiresInSeconds missing'
Assert ($null -ne $otp.message -and $otp.message.Length -gt 0) 'message missing'

if ($otp.pilotCode) {
    Write-Host "[OK] pilotCode returned: $($otp.pilotCode)" -ForegroundColor Green
    $code = $otp.pilotCode
}
else {
    Write-Host "[WARN] pilotCode not in response - flag off or old API build" -ForegroundColor Yellow
    $code = '000000'
}

Write-Host "`n[2] verify-otp (first device)..." -ForegroundColor Yellow
$login1 = Invoke-RestMethod "$Base/api/customer-app/auth/verify-otp" -Method POST -ContentType 'application/json' `
    -Body (@{ phone = $Phone; code = $code; tenantCode = $TenantCode } | ConvertTo-Json)
Assert ($null -ne $login1.accessToken) 'first verify failed'
Write-Host "[OK] first login: $($login1.profile.fullName)" -ForegroundColor Green

Write-Host "`n[3] verify-otp (second device, same code) - expect 401..." -ForegroundColor Yellow
try {
    Invoke-RestMethod "$Base/api/customer-app/auth/verify-otp" -Method POST -ContentType 'application/json' `
        -Body (@{ phone = $Phone; code = $code; tenantCode = $TenantCode } | ConvertTo-Json) | Out-Null
    throw 'second verify should fail but succeeded'
}
catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 401) {
        Write-Host "[OK] same OTP rejected on second use (401)" -ForegroundColor Green
    }
    else {
        throw
    }
}

Write-Host "`n[4] request-otp again (cooldown may apply)..." -ForegroundColor Yellow
Start-Sleep -Seconds 16
$otp2 = Invoke-RestMethod "$Base/api/customer-app/auth/request-otp" -Method POST -ContentType 'application/json' `
    -Body (@{ phone = $Phone; tenantCode = $TenantCode } | ConvertTo-Json)
Assert ($null -ne $otp2.pilotCode) 'second request should return pilotCode when flag on'
Write-Host "[OK] new pilotCode: $($otp2.pilotCode)" -ForegroundColor Green

Write-Host "`n=== ALL CHECKS PASSED ===" -ForegroundColor Green

