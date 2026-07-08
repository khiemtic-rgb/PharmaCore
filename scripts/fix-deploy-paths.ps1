# Fix inconsistent casing after rename (paths + systemd + docker)
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot

$files = Get-ChildItem -Path $Root -Recurse -Include *.sh,*.ps1,*.service,*.conf,*.yml,*.md -File |
    Where-Object { $_.FullName -notmatch '\\(bin|obj|node_modules|\\.git|\\.tmp)\\' }

$replacements = @(
    @('/var/www/kit-platform', '/var/www/kit-platform'),
    @('/etc/kit-platform', '/etc/kit-platform'),
    @('/opt/kit-platform', '/opt/kit-platform'),
    @('sites-available/kit-platform', 'sites-available/kit-platform'),
    @('sites-enabled/kit-platform', 'sites-enabled/kit-platform'),
    @('kit-platform-api', 'kit-platform-api'),
    @('kit-platform-sms-stub', 'kit-platform-sms-stub'),
    @('nginx-kit-platform.conf', 'nginx-kit-platform.conf'),
    @('kit-platform-upload', 'kit-platform-upload'),
    @('kit-platform-staff-deploy', 'kit-platform-staff-deploy'),
  @('kit-platform-deploy', 'kit-platform-deploy'),
    @('DB_USER="kitplatform"', 'DB_USER="kitplatform"'),
    @('POSTGRES_USER: kitplatform', 'POSTGRES_USER: kitplatform'),
    @('POSTGRES_DB: kitplatform', 'POSTGRES_DB: kitplatform'),
    @('POSTGRES_PASSWORD: kitplatform_dev_2026', 'POSTGRES_PASSWORD: kitplatform_dev_2026'),
    @('container_name: kitplatform-db', 'container_name: kitplatform-db'),
    @('kitplatform_pgdata', 'kitplatform_pgdata'),
    @('-U kitplatform -d kitplatform', '-U kitplatform -d kitplatform'),
    @('SyslogIdentifier=kit-platform-api', 'SyslogIdentifier=kit-platform-api')
)

foreach ($file in $files) {
    $content = Get-Content -LiteralPath $file.FullName -Raw -Encoding UTF8
    $updated = $content
    foreach ($pair in $replacements) {
        $updated = $updated.Replace($pair[0], $pair[1])
    }
    if ($updated -ne $content) {
        Set-Content -LiteralPath $file.FullName -Value $updated -Encoding UTF8 -NoNewline
        Write-Host "fixed: $($file.FullName.Replace($Root, '.'))"
    }
}

Write-Host "Deploy paths fixed." -ForegroundColor Green

