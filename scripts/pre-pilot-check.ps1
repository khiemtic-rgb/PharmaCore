# Pre-pilot gate: build + Platform.Tests + automated NVX-CS-08 smoke
param(
    [string]$BaseUrl = 'http://localhost:5290',
    [switch]$SkipSmoke,
    [switch]$SkipBuild
)

$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
Push-Location $root
try {
    if (-not $SkipBuild) {
        Write-Host '>> dotnet build API' -ForegroundColor Yellow
        dotnet build src/KitPlatform.Api/KitPlatform.Api.csproj --verbosity quiet
        if ($LASTEXITCODE -ne 0) { throw "build failed ($LASTEXITCODE)" }
    }

    Write-Host '>> dotnet test Platform.Tests' -ForegroundColor Yellow
    dotnet test tests/KitPlatform.Platform.Tests/KitPlatform.Platform.Tests.csproj --verbosity quiet
    if ($LASTEXITCODE -ne 0) { throw "tests failed ($LASTEXITCODE)" }

    if (-not $SkipSmoke) {
        Write-Host '>> smoke-pilot-nvx-cs08 (API must be running)' -ForegroundColor Yellow
        $smokeArgs = @{ SkipBuild = $true; BaseUrl = $BaseUrl }
        & (Join-Path $PSScriptRoot 'smoke-pilot-nvx-cs08.ps1') @smokeArgs
        if ($LASTEXITCODE -ne 0) { throw "smoke failed ($LASTEXITCODE)" }
    }

    Write-Host '[OK] Pre-pilot check passed.' -ForegroundColor Green
    Write-Host 'Next: .\scripts\manual-smoke-pilot-helper.ps1 (A1-A6 POS manual per tenant)' -ForegroundColor DarkGray
}
finally {
    Pop-Location
}

