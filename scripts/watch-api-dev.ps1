# Watchdog dev: tu khoi dong lai API neu port 5290 mat phan hoi.
$ErrorActionPreference = "SilentlyContinue"
. (Join-Path $PSScriptRoot "api-dev.ps1")

while ($true) {
    Start-Sleep -Seconds 8
    if (Test-ApiDevHealth) { continue }

    try {
        Ensure-ApiDev -Quiet -SkipWatcher -SkipBuild | Out-Null
    }
    catch {
        # Log loi lan restart tiep theo
    }
}
