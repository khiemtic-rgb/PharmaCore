<#
.SYNOPSIS
  Sinh cặp VAPID key cho Web Push (CustomerAppPush).

.EXAMPLE
  .\scripts\generate-vapid-keys.ps1
  .\scripts\generate-vapid-keys.ps1 -Subject "mailto:care@nhathuoc.vn"
#>
param(
    [string]$Subject = "mailto:push@your-pharmacy.vn"
)

$ErrorActionPreference = "Stop"

Write-Host "=== PharmaCore VAPID key generator ===" -ForegroundColor Cyan

$output = npx --yes web-push@3 generate-vapid-keys 2>&1 | Out-String
$public = $null
$private = $null
foreach ($line in ($output -split "`n")) {
    if ($line -match 'Public Key:\s*(\S+)') { $public = $Matches[1].Trim() }
    if ($line -match 'Private Key:\s*(\S+)') { $private = $Matches[1].Trim() }
}

if (-not $public -or -not $private) {
    Write-Host "[LOI] Không đọc được output từ web-push." -ForegroundColor Red
    Write-Host $output
    exit 1
}

Write-Host ""
Write-Host "PublicKey (CustomerAppPush__PublicKey):" -ForegroundColor Green
Write-Host $public
Write-Host ""
Write-Host "PrivateKey (CustomerAppPush__PrivateKey):" -ForegroundColor Green
Write-Host $private
Write-Host ""
Write-Host "Subject (CustomerAppPush__Subject): $Subject" -ForegroundColor Gray
Write-Host ""
Write-Host "Production env:" -ForegroundColor Yellow
Write-Host "  CustomerAppPush__Enabled=true"
Write-Host "  CustomerAppPush__Subject=$Subject"
Write-Host "  CustomerAppPush__PublicKey=$public"
Write-Host "  CustomerAppPush__PrivateKey=$private"
Write-Host ""
Write-Host "Sau khi set env: restart API → .\scripts\verify-push-config.ps1" -ForegroundColor Cyan
Write-Host "Hướng dẫn pilot NT: docs\customer-app-push-pilot.md" -ForegroundColor Cyan
