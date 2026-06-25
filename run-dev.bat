@echo off
chcp 65001 >nul
cd /d "%~dp0"
title PharmaCore Dev (API + Admin + Customer)

echo === PharmaCore: API + Admin + Customer App ===
echo API:      http://localhost:5290  +  https://localhost:7224
echo Admin:    http://localhost:5173  (admin / Admin@123)
echo Customer: https://localhost:5174  (0909123456 / OTP 000000 / DEMO_PHARMACY)
echo.

echo [1/4] Kiem tra PostgreSQL...
powershell -NoProfile -ExecutionPolicy Bypass -File ".\scripts\check-postgres.ps1"
if errorlevel 1 (
    echo.
    echo Neu chua setup DB: chay scripts\setup-and-migrate.bat
    pause
    exit /b 1
)
echo.

where npm >nul 2>&1
if errorlevel 1 (
    echo [CANH BAO] Chua cai Node.js/npm. Cai tu: https://nodejs.org
    echo Chi chay API...
    start "PharmaCore API" cmd /k "dotnet run --project src\PharmaCore.Api\PharmaCore.Api.csproj --launch-profile https"
    goto :end
)

if not exist "client\admin\node_modules" (
    echo [2/5] npm install trong client\admin...
    pushd client\admin
    call npm install
    if errorlevel 1 (
        echo [LOI] npm install that bai
        popd
        pause
        exit /b 1
    )
    popd
)

if not exist "client\customer-app\node_modules" (
    echo [2/5] npm install trong client\customer-app...
    pushd client\customer-app
    call npm install
    if errorlevel 1 (
        echo [LOI] npm install customer-app that bai
        popd
        pause
        exit /b 1
    )
    popd
)

echo [3/5] Dung API cu (neu co)...
taskkill /F /IM PharmaCore.Api.exe >nul 2>&1

echo [3/5] Build API...
dotnet build "src\PharmaCore.Api\PharmaCore.Api.csproj" --verbosity quiet
if errorlevel 1 (
    echo [LOI] Build API that bai
    pause
    exit /b 1
)

echo [3/5] Khoi dong API...
start "PharmaCore API" cmd /k "dotnet run --project src\PharmaCore.Api\PharmaCore.Api.csproj --launch-profile https"

timeout /t 4 /nobreak >nul

echo [4/5] Khoi dong Customer App...
start "PharmaCore Customer App" cmd /k "cd /d %~dp0client\customer-app && npm run dev"

timeout /t 2 /nobreak >nul

echo [5/5] Khoi dong Admin Web...
pushd client\admin
call npm run dev
popd

:end
pause
