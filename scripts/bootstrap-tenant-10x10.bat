@echo off
chcp 65001 >nul
cd /d "%~dp0\.."
echo === KitPlatform: Bootstrap 10x10 (chi nhanh + nhan vien) ===
powershell -NoProfile -ExecutionPolicy Bypass -File ".\scripts\bootstrap-tenant-10x10.ps1" %*
if errorlevel 1 exit /b 1
echo.
echo Tiep theo: powershell -File scripts\run-readiness-check.ps1 -StaffUat -SkipMigrate -SkipRestart
pause
