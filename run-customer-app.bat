@echo off
chcp 65001 >nul
cd /d "%~dp0"
title PharmaCore Customer App

echo === PharmaCore Customer App ===
echo Web:  http://localhost:5174  (dung http — push/PWA dev)
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

powershell -NoProfile -ExecutionPolicy Bypass -File ".\scripts\ensure-api.ps1"
if errorlevel 1 (
    echo [LOI] Khong khoi dong duoc API. Xem .dev\api.err.log
    pause
    exit /b 1
)

pushd client\customer-app
call npm run dev:vite
popd
