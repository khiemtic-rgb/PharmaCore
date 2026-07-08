# One-shot rename KitPlatform -> KitPlatform (Phase E early)
# Run from repo root: powershell -File scripts/rename-to-kit-platform.ps1
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot

Write-Host ">> Rename repo at $Root" -ForegroundColor Cyan

function Rename-IfExists([string]$Old, [string]$New) {
    if (Test-Path $Old) {
        if (Test-Path $New) { throw "Target already exists: $New" }
        Rename-Item -LiteralPath $Old -NewName (Split-Path $New -Leaf)
        Write-Host "  dir: $(Split-Path $Old -Leaf) -> $(Split-Path $New -Leaf)"
    }
}

# 1) Rename directories (deepest first)
$dirRenames = @(
    "$Root\src\Packs\Pharmacy\KitPlatform.Packs.Pharmacy.Application", "$Root\src\Packs\Pharmacy\KitPlatform.Packs.Pharmacy.Application"
    "$Root\src\Packs\Pharmacy\KitPlatform.Packs.Pharmacy.Infrastructure", "$Root\src\Packs\Pharmacy\KitPlatform.Packs.Pharmacy.Infrastructure"
    "$Root\src\Packs\Clinic\KitPlatform.Packs.Clinic.Application", "$Root\src\Packs\Clinic\KitPlatform.Packs.Clinic.Application"
    "$Root\src\Packs\Clinic\KitPlatform.Packs.Clinic.Infrastructure", "$Root\src\Packs\Clinic\KitPlatform.Packs.Clinic.Infrastructure"
    "$Root\src\Packs\Survey\KitPlatform.Packs.Survey.Application", "$Root\src\Packs\Survey\KitPlatform.Packs.Survey.Application"
    "$Root\src\Packs\Survey\KitPlatform.Packs.Survey.Infrastructure", "$Root\src\Packs\Survey\KitPlatform.Packs.Survey.Infrastructure"
    "$Root\src\KitPlatform.Api", "$Root\src\KitPlatform.Api"
    "$Root\src\KitPlatform.Application", "$Root\src\KitPlatform.Application"
    "$Root\src\KitPlatform.Domain", "$Root\src\KitPlatform.Domain"
    "$Root\src\KitPlatform.Infrastructure", "$Root\src\KitPlatform.Infrastructure"
    "$Root\tests\KitPlatform.Application.Tests", "$Root\tests\KitPlatform.Application.Tests"
    "$Root\tests\KitPlatform.Platform.Tests", "$Root\tests\KitPlatform.Platform.Tests"
)
for ($i = 0; $i -lt $dirRenames.Length; $i += 2) {
    Rename-IfExists $dirRenames[$i] $dirRenames[$i + 1]
}

# 2) Rename .csproj files
Get-ChildItem -Path $Root -Recurse -Filter "KitPlatform*.csproj" -File |
    Where-Object { $_.FullName -notmatch '\\(bin|obj|node_modules)\\' } |
    ForEach-Object {
        $newName = $_.Name -replace 'KitPlatform', 'KitPlatform'
        Rename-Item -LiteralPath $_.FullName -NewName $newName
        Write-Host "  csproj: $($_.Name) -> $newName"
    }

# 3) Solution file
if (Test-Path "$Root\KitPlatform.slnx") {
    Rename-Item "$Root\KitPlatform.slnx" "KitPlatform.slnx"
}

# 4) Deploy artifact filenames
$deployRenames = @(
    @("$Root\deploy\ubuntu\kit-platform-api.service", "$Root\deploy\ubuntu\kit-platform-api.service"),
    @("$Root\deploy\ubuntu\nginx-kit-platform.conf", "$Root\deploy\ubuntu\nginx-kit-platform.conf"),
    @("$Root\deploy\ubuntu\kit-platform-sms-stub.service", "$Root\deploy\ubuntu\kit-platform-sms-stub.service")
)
foreach ($pair in $deployRenames) {
    Rename-IfExists $pair[0] $pair[1]
}

# 5) Text replace in repo (exclude build artifacts)
$skipDir = '(\\bin\\|\\obj\\|node_modules|\\.git\\|\\.tmp\\)'
$extensions = @('*.cs', '*.csproj', '*.slnx', '*.json', '*.md', '*.ps1', '*.sh', '*.yml', '*.yaml', '*.env*', '*.bat', '*.service', '*.conf', '*.sql', '*.mdc', '*.props', '*.targets')

$files = Get-ChildItem -Path $Root -Recurse -Include $extensions -File |
    Where-Object { $_.FullName -notmatch $skipDir }

foreach ($file in $files) {
    $content = Get-Content -LiteralPath $file.FullName -Raw -Encoding UTF8
    if ($content -notmatch 'KitPlatform|KitPlatform|KitPlatform') { continue }

    $updated = $content `
        -replace 'KitPlatform', 'KitPlatform' `
        -replace 'KitPlatform_DB', 'KITPLATFORM_DB' `
        -replace 'KitPlatform_dev_2026', 'kitplatform_dev_2026' `
        -replace 'kitplatform_pgdata', 'kitplatform_pgdata' `
        -replace 'KitPlatform-db', 'kitplatform-db' `
        -replace 'kit-platform-api', 'kit-platform-api' `
        -replace 'kit-platform-sms-stub', 'kit-platform-sms-stub' `
        -replace 'KitPlatform-nginx', 'kit-platform-nginx' `
        -replace 'kit-platform-upload', 'kitplatform-upload' `
        -replace 'kit-platform-deploy', 'kitplatform-deploy' `
        -replace 'KitPlatform-nginx-fix', 'kitplatform-nginx-fix' `
        -replace '/var/www/kit-platform', '/var/www/kit-platform' `
        -replace '/opt/kit-platform', '/opt/kit-platform' `
        -replace '/etc/kit-platform', '/etc/kit-platform' `
        -replace '@demo\.KitPlatform\.vn', '@demo.kitplatform.vn' `
        -replace 'postgresql://KitPlatform:', 'postgresql://kitplatform:' `
        -replace 'POSTGRES_USER: kitplatform', 'POSTGRES_USER: kitplatform' `
        -replace 'POSTGRES_DB: kitplatform', 'POSTGRES_DB: kitplatform' `
        -replace '\bKitPlatform\b', 'kitplatform'

    if ($updated -ne $content) {
        Set-Content -LiteralPath $file.FullName -Value $updated -Encoding UTF8 -NoNewline
    }
}

# 6) Fix solution paths
if (Test-Path "$Root\KitPlatform.slnx") {
    $sln = @"
<Solution>
  <Project Path="src/KitPlatform.Api/KitPlatform.Api.csproj" />
  <Project Path="src/KitPlatform.Application/KitPlatform.Application.csproj" />
  <Project Path="src/KitPlatform.Domain/KitPlatform.Domain.csproj" />
  <Project Path="src/KitPlatform.Infrastructure/KitPlatform.Infrastructure.csproj" />
  <Project Path="src/Packs/Pharmacy/KitPlatform.Packs.Pharmacy.Application/KitPlatform.Packs.Pharmacy.Application.csproj" />
  <Project Path="src/Packs/Pharmacy/KitPlatform.Packs.Pharmacy.Infrastructure/KitPlatform.Packs.Pharmacy.Infrastructure.csproj" />
  <Project Path="src/Packs/Clinic/KitPlatform.Packs.Clinic.Application/KitPlatform.Packs.Clinic.Application.csproj" />
  <Project Path="src/Packs/Clinic/KitPlatform.Packs.Clinic.Infrastructure/KitPlatform.Packs.Clinic.Infrastructure.csproj" />
  <Project Path="src/Packs/Survey/KitPlatform.Packs.Survey.Application/KitPlatform.Packs.Survey.Application.csproj" />
  <Project Path="src/Packs/Survey/KitPlatform.Packs.Survey.Infrastructure/KitPlatform.Packs.Survey.Infrastructure.csproj" />
  <Project Path="tests/KitPlatform.Application.Tests/KitPlatform.Application.Tests.csproj" />
  <Project Path="tests/KitPlatform.Platform.Tests/KitPlatform.Platform.Tests.csproj" />
</Solution>
"@
    Set-Content "$Root\KitPlatform.slnx" $sln -Encoding UTF8
}

Write-Host ">> Done. Rename root folder manually if needed: KitPlatform -> KitPlatform" -ForegroundColor Green

