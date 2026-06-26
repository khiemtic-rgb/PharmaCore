# Dung API dev nen + watchdog (khi can tat het de build lai).
$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "api-dev.ps1")
Stop-ApiDevAll
