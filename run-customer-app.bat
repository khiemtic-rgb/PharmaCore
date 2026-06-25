@echo off
chcp 65001 >nul
cd /d "%~dp0"
title PharmaCore Customer App

echo === PharmaCore Customer App ===
echo Web:  https://localhost:5174  (hoac http://localhost:5174)
echo API:  http://localhost:5290 (can chay rieng)
echo Demo: 0909123456 / OTP 000000 / DEMO_PHARMACY
echo.

where npm >nul 2>&1
if errorlevel 1 (
    echo [LOI] Can Node.js/npm: https://nodejs.org
    pause
    exit /b 1
)

if not exist "client\customer-app\node_modules" (
    echo npm install...
    pushd client\customer-app
    call npm install
    if errorlevel 1 (
        popd
        pause
        exit /b 1
    )
    popd
)

powershell -NoProfile -ExecutionPolicy Bypass -Command "try { $h = Invoke-RestMethod -Uri 'http://localhost:5290/api/health' -TimeoutSec 3; if ($h.status -ne 'ok') { throw 'bad' } } catch { Write-Host '[CANH BAO] API chua chay tai http://localhost:5290' -ForegroundColor Yellow; Write-Host '         Chay run-dev.bat hoac .\scripts\restart-api.ps1 truoc.' -ForegroundColor Yellow; Write-Host '' }"

pushd client\customer-app
call npm run dev
popd
