@echo off
chcp 65001 >nul
cd /d "%~dp0\.."
echo === KitPlatform: Setup Database + Migrations ===
echo.
set /p PGPASS="Nhap mat khau user postgres (cai dat luc cai PostgreSQL): "
powershell -NoProfile -ExecutionPolicy Bypass -File ".\scripts\setup-and-migrate.ps1" -PostgresPassword "%PGPASS%"
pause
