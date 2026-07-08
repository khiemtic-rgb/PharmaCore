# NVX-CS-08 - Manual smoke helper (per tenant)
# Prints steps, URLs, demo data, audit SQL after automated smoke passes.
param(
    [string]$TenantCode = 'DEMO_PHARMACY',
    [string]$AdminUrl = 'http://localhost:5173',
    [string]$CustomerUrl = 'http://localhost:5174',
    [string]$ApiUrl = 'http://localhost:5290',
    [string]$ConnectionString = 'postgresql://kitplatform:kitplatform_dev_2026@localhost:5432/kitplatform',
    [switch]$AuditOnly
)

$ErrorActionPreference = 'Stop'

function Write-Section([string]$Title) {
    Write-Host "`n=== $Title ===" -ForegroundColor Cyan
}

function Get-Psql {
    $candidates = @(
        'C:\Program Files\PostgreSQL\18\bin\psql.exe',
        'C:\Program Files\PostgreSQL\17\bin\psql.exe',
        'C:\Program Files\PostgreSQL\16\bin\psql.exe'
    )
    $psql = $candidates | Where-Object { Test-Path $_ } | Select-Object -First 1
    if (-not $psql) {
        $cmd = Get-Command psql -ErrorAction SilentlyContinue
        if ($cmd) { $psql = $cmd.Source }
    }
    return $psql
}

Write-Section 'NVX-CS-08 Manual smoke helper'
Write-Host "Tenant: $TenantCode"
Write-Host "Admin:  $AdminUrl  (admin / Admin@123)"
Write-Host "Customer: $CustomerUrl  (0909123456 / OTP 000000)"
Write-Host "API:    $ApiUrl"

if ($AuditOnly) {
    Write-Section 'Audit log (last 5, tenant)'
    $psql = Get-Psql
    if (-not $psql) {
        Write-Host '[WARN] psql not found - run manually:' -ForegroundColor Yellow
        Write-Host "SELECT action, entity_type, entity_id, created_at FROM audit_logs"
        Write-Host "WHERE tenant_id = (SELECT id FROM tenants WHERE tenant_code = '$TenantCode')"
        Write-Host 'ORDER BY created_at DESC LIMIT 5;'
        exit 0
    }
    $sql = @"
SELECT created_at, action, entity_type, entity_id
FROM audit_logs
WHERE tenant_id = (SELECT id FROM tenants WHERE tenant_code = '$TenantCode' AND deleted_at IS NULL)
ORDER BY created_at DESC
LIMIT 5;
"@
    & $psql $ConnectionString -c $sql
    exit 0
}

Write-Section 'A. POS and Core Engines (manual ~30 min)'
@(
    'A1 | Admin > Ban hang (POS) | Mo ca > ban Paracetamol (8934567890012) FEFO | Don hoan tat, ton giam dung lo',
    'A2 | POS | Ban SL vuot lo 1 | Canh bao FEFO hoac lay lo ke tiep',
    'A3 | POS (user thuong) | Chiet khau dong vuot % | Tu choi',
    'A4 | POS (admin) | Chiet khau hop le | Don OK',
    'A5 | Mua hang > PO > GRN | Nhap 1 dong | Ton tang',
    'A6 | Kho > Kiem ke | Duyet dieu chinh | Ton khop'
) | ForEach-Object { Write-Host "  [ ] $_" }

Write-Host ''
Write-Host '  Ref: client/admin/demo-pos-checklist.md, demo-procurement-checklist.md' -ForegroundColor DarkGray
Write-Host "  After A1/A5: .\scripts\manual-smoke-pilot-helper.ps1 -AuditOnly -TenantCode $TenantCode"

Write-Section 'B5 Pharmacist chat (manual UI after API smoke)'
@(
    '1 | Customer app > Tai khoan | Bat dong y Chat duoc si (InApp + AiAssist) neu chua bat',
    '2 | Customer app > /chat | Gui: "Xin chao, thuoc Paracetamol uong luc nao?"',
    '3 | Admin http://localhost:5173 | Ban hang > Chat KH (hoac module chat staff) | Tra loi tin',
    '4 | Customer app | Reload /chat | Thay tin staff; unread badge giam sau doc',
    '5 | (Optional) Staff POS mobile > Chat | Tra loi tu mobile'
) | ForEach-Object { Write-Host "  [ ] $_" }
Write-Host ''
Write-Host ('  Customer chat: {0}/chat' -f $CustomerUrl) -ForegroundColor DarkGray

Write-Section 'B. Customer App (partial auto - finish manual)'
@(
    'B1-B4,B5-B6,H1-H6 | DONE if smoke-pilot-nvx-cs08.ps1 PASS (23+ steps)',
    'B5 | Customer app > Chat duoc si | API: consent + send OK (smoke script); UI: staff reply manual below',
    'B5-UI | Customer > /chat | Gui tin; Admin/Staff > Chat tra loi | Tin hien 2 phia',
) | ForEach-Object { Write-Host "  [ ] $_" }

Write-Section 'C. Admin reports'
@(
    'C1 | Admin > Khach hang > Engagement | AI usage > 0 sau B3',
    'C2 | Bao cao > INV-02 can date | Co du lieu neu co lo HSD',
    'C3 | Dashboard doanh thu | Khop don A1'
) | ForEach-Object { Write-Host "  [ ] $_" }

Write-Section 'D. Regression (~15 min)'
@(
    'Tra hang 1 dong (neu da ban A1)',
    'Dat truoc / draft O2O - staff xac nhan',
    'Staff POS mobile: lookup ton 1 ma'
) | ForEach-Object { Write-Host "  [ ] $_" }

Write-Section 'F4 Admin UI (manual once)'
Write-Host ('  [ ] {0}/system/platform-pack - xem/sua pack modules (ADMIN)' -f $AdminUrl)

Write-Section 'Sign-off (copy to checklist doc)'
Write-Host 'Tenant       | Nguoi test | Ngay       | A pass | B pass | Ghi chu'
Write-Host '-------------|------------|------------|--------|--------|--------'
Write-Host ('{0,-12}|            |            | [ ]    | [ ]    |' -f $TenantCode)
Write-Host 'NT2          |            |            | [ ]    | [ ]    |'
Write-Host 'NT3          |            |            | [ ]    | [ ]    |'
Write-Host ''
Write-Host 'Pass criteria: A1-A5 + B1-B4 required.'
Write-Host 'Doc: docs/novixa/07-customer/pilot-smoke-test-checklist-v1.md'

Write-Section 'Quick links'
Write-Host ('  Admin POS:     {0}/sales/pos' -f $AdminUrl)
Write-Host ('  Platform pack: {0}/system/platform-pack' -f $AdminUrl)
Write-Host ('  Audit log:     {0}/system/audit-log' -f $AdminUrl)
Write-Host ('  Customer app:  {0}' -f $CustomerUrl)
Write-Host ('  Swagger:       {0}/swagger' -f $ApiUrl)

