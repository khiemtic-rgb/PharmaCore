<#
.SYNOPSIS
  Tao tenant dau tien cho mot nha thuoc (sau run-migrations-prod.ps1).

.EXAMPLE
  .\scripts\bootstrap-first-tenant.ps1 `
    -ConnectionString "postgresql://KitPlatform:secret@localhost:5432/KitPlatform_nt_a" `
    -TenantCode "NT_A" `
    -TenantName "Nha Thuoc An" `
    -BranchCode "CN01" `
    -BranchName "Quay chinh" `
    -AdminUsername "admin" `
    -AdminEmail "admin@nhathuoc-a.vn" `
    -AdminPassword "Pilot@2026!"
#>
param(
    [Parameter(Mandatory = $true)]
    [string]$ConnectionString,

    [Parameter(Mandatory = $true)]
    [string]$TenantCode,

    [Parameter(Mandatory = $true)]
    [string]$TenantName,

    [string]$BranchCode = "CN01",
    [string]$BranchName = "Quay chinh",
    [string]$BranchAddress = "",
    [string]$BranchPhone = "",

    [string]$WarehouseCode = "WH_MAIN",
    [string]$WarehouseName = "Kho chinh",

    [string]$AdminUsername = "admin",
    [Parameter(Mandatory = $true)]
    [string]$AdminEmail,
    [string]$AdminFullName = "Quan tri vien",
    [Parameter(Mandatory = $true)]
    [string]$AdminPassword,

    [switch]$LoyaltyEnabled
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot

$psqlCandidates = @(
    "C:\Program Files\PostgreSQL\18\bin\psql.exe",
    "C:\Program Files\PostgreSQL\17\bin\psql.exe",
    "C:\Program Files\PostgreSQL\16\bin\psql.exe"
)
$psql = $psqlCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $psql) {
    $cmd = Get-Command psql -ErrorAction SilentlyContinue
    if ($cmd) { $psql = $cmd.Source }
}
if (-not $psql) {
    Write-Host "[LOI] Khong tim thay psql." -ForegroundColor Red
    exit 1
}

$hashTool = Join-Path $Root "tools\HashPasswordTool\HashPasswordTool.csproj"
if (-not (Test-Path $hashTool)) {
    Write-Host "[LOI] Thieu tools/HashPasswordTool — can de hash mat khau admin." -ForegroundColor Red
    exit 1
}

Write-Host ">> Hash mat khau admin..." -ForegroundColor Yellow
$passwordHash = (dotnet run --project $hashTool -- $AdminPassword).Trim()
if (-not $passwordHash.StartsWith('$2')) {
    Write-Host "[LOI] Hash mat khau that bai." -ForegroundColor Red
    exit 1
}

$tenantId = [guid]::NewGuid().ToString()
$branchId = [guid]::NewGuid().ToString()
$employeeId = [guid]::NewGuid().ToString()
$userId = [guid]::NewGuid().ToString()
$roleId = [guid]::NewGuid().ToString()
$warehouseId = [guid]::NewGuid().ToString()

$loyaltyJson = if ($LoyaltyEnabled) { "true" } else { "false" }
$settingsJson = "{""allow_negative_stock"": false, ""loyalty_enabled"": $loyaltyJson, ""batch_mode"": ""suggest""}"

function Escape-Sql([string]$s) {
    return $s.Replace("'", "''")
}

$sql = @"
BEGIN;

INSERT INTO tenants (id, tenant_code, tenant_name, country_code, default_currency, settings)
VALUES (
    '$tenantId',
    '$(Escape-Sql $TenantCode.Trim())',
    '$(Escape-Sql $TenantName.Trim())',
    'VN', 'VND',
    '$settingsJson'::jsonb
);

INSERT INTO branches (id, tenant_id, branch_code, branch_name, address, phone, is_head_office)
VALUES (
    '$branchId',
    '$tenantId',
    '$(Escape-Sql $BranchCode.Trim())',
    '$(Escape-Sql $BranchName.Trim())',
    NULLIF('$(Escape-Sql $BranchAddress.Trim())', ''),
    NULLIF('$(Escape-Sql $BranchPhone.Trim())', ''),
    TRUE
);

INSERT INTO employees (id, tenant_id, employee_code, full_name, phone, email)
VALUES (
    '$employeeId',
    '$tenantId',
    'EMP001',
    '$(Escape-Sql $AdminFullName.Trim())',
    NULLIF('$(Escape-Sql $BranchPhone.Trim())', ''),
    '$(Escape-Sql $AdminEmail.Trim())'
);

-- Admin tenant: khong gan employee_branches (ADMIN unrestricted tren moi chi nhanh).

INSERT INTO users (id, tenant_id, employee_id, username, email, password_hash)
VALUES (
    '$userId',
    '$tenantId',
    '$employeeId',
    '$(Escape-Sql $AdminUsername.Trim())',
    '$(Escape-Sql $AdminEmail.Trim())',
    '$(Escape-Sql $passwordHash)'
);

INSERT INTO roles (id, tenant_id, role_code, role_name)
VALUES ('$roleId', '$tenantId', 'ADMIN', 'Quan tri vien');

INSERT INTO user_roles (user_id, role_id)
VALUES ('$userId', '$roleId');

INSERT INTO role_permissions (role_id, permission_id)
SELECT '$roleId', p.id FROM permissions p
ON CONFLICT DO NOTHING;

INSERT INTO warehouses (id, tenant_id, branch_id, warehouse_code, warehouse_name, warehouse_type, is_default)
VALUES (
    '$warehouseId',
    '$tenantId',
    '$branchId',
    '$(Escape-Sql $WarehouseCode.Trim())',
    '$(Escape-Sql $WarehouseName.Trim())',
    1,
    TRUE
);

COMMIT;
"@

$tempSql = Join-Path $env:TEMP "KitPlatform-bootstrap-$tenantId.sql"
Set-Content -Path $tempSql -Value $sql -Encoding UTF8

Write-Host "=== Bootstrap tenant: $TenantCode ===" -ForegroundColor Cyan
& $psql $ConnectionString -v ON_ERROR_STOP=1 -f $tempSql
if ($LASTEXITCODE -ne 0) {
    Remove-Item $tempSql -ErrorAction SilentlyContinue
    Write-Host "[LOI] Bootstrap that bai." -ForegroundColor Red
    exit $LASTEXITCODE
}
Remove-Item $tempSql -ErrorAction SilentlyContinue

Write-Host "=== XONG ===" -ForegroundColor Green
Write-Host "Tenant:   $TenantCode ($tenantId)"
Write-Host "Dang nhap: $AdminUsername / (mat khau ban vua nhap)"
Write-Host "Doi mat khau ngay sau khi dang nhap lan dau." -ForegroundColor Yellow

