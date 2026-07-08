# Khoi dong API chi khi chua chay - tranh trung port / nhieu instance.
$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "api-dev.ps1")
exit (Ensure-ApiDev)

