@echo off
chcp 65001 >nul
cd /d "%~dp0"
title KitPlatform

echo === Khoi dong KitPlatform ===
echo Swagger: https://localhost:7xxx/swagger
echo.

dotnet run --project src\KitPlatform.Api\KitPlatform.Api.csproj
pause
