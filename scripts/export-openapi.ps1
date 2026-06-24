# Xuất OpenAPI spec từ PharmaCore.Api (không cần API đang chạy).
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$apiProject = Join-Path $root "src\PharmaCore.Api\PharmaCore.Api.csproj"
$outDir = Join-Path $root "client\admin\openapi"
$outFile = Join-Path $outDir "swagger.json"

Push-Location $root
try {
    Write-Host "Restoring dotnet tools..."
    dotnet tool restore | Out-Null

    $dll = Join-Path $root "src\PharmaCore.Api\bin\Debug\net10.0\PharmaCore.Api.dll"
    New-Item -ItemType Directory -Force -Path $outDir | Out-Null

    Write-Host "Building API..."
    $buildOk = $true
    dotnet build $apiProject -c Debug 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) { $buildOk = $false }

    if ($buildOk -and (Test-Path $dll)) {
        Write-Host "Exporting OpenAPI (offline) -> $outFile"
        dotnet swagger tofile --output $outFile $dll v1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "OK: $(Get-Item $outFile | Select-Object -ExpandProperty Length) bytes"
            return
        }
        Write-Warning "swagger tofile failed; trying live API..."
    }
    else {
        Write-Warning "API build skipped (DLL locked?). Trying live API at http://localhost:5290 ..."
    }

    $liveUrl = "http://localhost:5290/swagger/v1/swagger.json"
    Invoke-WebRequest -Uri $liveUrl -UseBasicParsing -OutFile $outFile
    Write-Host "OK (live): $(Get-Item $outFile | Select-Object -ExpandProperty Length) bytes from $liveUrl"
}
finally {
    Pop-Location
}
