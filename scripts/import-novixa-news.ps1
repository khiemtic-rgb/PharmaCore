# Import tin tá»« Excel/CSV
$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..\novixa-site")

if (-not (Test-Path "node_modules")) {
  npm install
}

npm run import:news

Write-Host ""
Write-Host "Tiáº¿p theo (náº¿u muá»‘n lÃªn novixa.vn):" -ForegroundColor Cyan
Write-Host "  git add src/content/tin-tuc import/"
Write-Host "  git commit -m `"Import tin tuc`""
Write-Host "  git push origin main"

