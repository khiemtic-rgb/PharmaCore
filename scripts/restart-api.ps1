$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$ApiProject = Join-Path $Root "src\PharmaCore.Api\PharmaCore.Api.csproj"

function Stop-ApiListeners {
    Write-Host ">> Dung API cu (port 5290, 7224)..." -ForegroundColor Yellow
    Get-Process -Name "PharmaCore.Api" -ErrorAction SilentlyContinue | Stop-Process -Force
    foreach ($port in 5290, 7224) {
        Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue |
            ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
    }
    Start-Sleep -Seconds 2
}

Write-Host "=== Restart PharmaCore API ===" -ForegroundColor Cyan

Stop-ApiListeners

Write-Host ">> Kiem tra PostgreSQL..." -ForegroundColor Yellow
& (Join-Path $PSScriptRoot "check-postgres.ps1")
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ">> Build API..." -ForegroundColor Yellow
$env:NUGET_PACKAGES = "$env:USERPROFILE\.nuget\packages"
dotnet build $ApiProject --verbosity minimal
if ($LASTEXITCODE -ne 0) {
    Write-Host "[LOI] Build that bai. Dong cua so API cu roi chay lai." -ForegroundColor Red
    exit $LASTEXITCODE
}

Write-Host ">> Khoi dong API (http://localhost:5290 + https://localhost:7224)..." -ForegroundColor Yellow
Start-Process -FilePath "dotnet" -ArgumentList @(
    "run", "--project", $ApiProject, "--no-build", "--launch-profile", "https"
) -WorkingDirectory $Root -WindowStyle Normal

Start-Sleep -Seconds 6

$httpOk = $false
$httpsOk = $false

try {
    $health = Invoke-RestMethod -Uri "http://localhost:5290/api/health" -TimeoutSec 15
    Write-Host "[OK] API (HTTP :5290): $($health.status)" -ForegroundColor Green
    $httpOk = $true
}
catch {
    Write-Host "[LOI] API HTTP :5290 chua phan hoi." -ForegroundColor Red
}

try {
    $httpsCode = & curl.exe -k -s -o NUL -w "%{http_code}" "https://localhost:7224/api/health"
    if ($httpsCode -eq "200") {
        Write-Host "[OK] API (HTTPS :7224): ok" -ForegroundColor Green
        $httpsOk = $true
    }
    else {
        throw "HTTP $httpsCode"
    }
}
catch {
    Write-Host "[LOI] API HTTPS :7224 chua phan hoi." -ForegroundColor Red
    Write-Host "      Thu: dotnet dev-certs https --trust" -ForegroundColor Yellow
    Write-Host "      Roi chay lai: .\scripts\restart-api.ps1" -ForegroundColor Yellow
}

if (-not $httpOk) {
    Write-Host "[LOI] API chua san sang. Xem cua so API de biet loi." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Swagger HTTP:  http://localhost:5290/swagger" -ForegroundColor DarkGray
Write-Host "Swagger HTTPS: https://localhost:7224/swagger" -ForegroundColor DarkGray
Write-Host "Mo nhanh:      https://localhost:7224/" -ForegroundColor DarkGray
Write-Host "Admin:         http://localhost:5173" -ForegroundColor DarkGray

if (-not $httpsOk) { exit 1 }
