# Smoke test all admin modules against real data.
# Usage:
#   .\scripts\smoke-all-modules.ps1 -BaseUrl https://api.novixa.vn -TenantCode NT_XUANHOA -AdminPass '***'
param(
    [string]$BaseUrl = 'https://api.novixa.vn',
    [string]$TenantCode = 'NT_XUANHOA',
    [string]$AdminUser = 'admin',
    [string]$AdminPass = '',
    [switch]$SkipLogin
)

$ErrorActionPreference = 'Continue'
$passed = 0
$failed = @()
$warn = @()
$script:warehouseId = $null

function Write-Group([string]$Title) {
    Write-Host ""
    Write-Host "=== $Title ===" -ForegroundColor Cyan
}

function Test-Api {
    param(
        [string]$Id,
        [string]$Name,
        [string]$Path,
        [string]$Method = 'GET',
        [object]$Body = $null,
        [scriptblock]$Assert = $null,
        [switch]$Optional
    )
    try {
        $uri = "$BaseUrl$Path"
        $params = @{
            Method     = $Method
            Uri        = $uri
            Headers    = $script:h
            TimeoutSec = 30
        }
        if ($Body -ne $null) {
            $params.ContentType = 'application/json'
            $params.Body = ($Body | ConvertTo-Json -Compress -Depth 6)
        }
        $result = Invoke-RestMethod @params
        if ($Assert) {
            & $Assert $result
        }
        Write-Host ('[OK]   ' + $Id + ' ' + $Name) -ForegroundColor Green
        $script:passed++
    }
    catch {
        $msg = $_.Exception.Message
        if ($_.Exception.Response) {
            try {
                $reader = New-Object IO.StreamReader($_.Exception.Response.GetResponseStream())
                $detail = $reader.ReadToEnd()
                if ($detail) { $msg = "$msg | $detail" }
            }
            catch { }
        }
        if ($Optional) {
            Write-Host ('[SKIP] ' + $Id + ' ' + $Name + ' - ' + $msg) -ForegroundColor Yellow
            $script:warn += "$Id $Name"
        }
        else {
            Write-Host ('[FAIL] ' + $Id + ' ' + $Name) -ForegroundColor Red
            Write-Host ('       ' + $msg) -ForegroundColor DarkRed
            $script:failed += "$Id $Name"
        }
    }
}

Write-Host ""
Write-Host "=== KitPlatform ALL MODULES smoke ===" -ForegroundColor Cyan
Write-Host "API=$BaseUrl Tenant=$TenantCode"

if (-not $SkipLogin) {
    if (-not $AdminPass) { throw 'Missing -AdminPass' }
    Write-Group 'Auth'
    try {
        $auth = Invoke-RestMethod "$BaseUrl/api/auth/login" -Method POST -ContentType 'application/json' `
            -Body (@{ username = $AdminUser; password = $AdminPass; tenantCode = $TenantCode } | ConvertTo-Json) -TimeoutSec 20
        if (-not $auth.accessToken) { throw 'no access token' }
        $script:h = @{ Authorization = "Bearer $($auth.accessToken)" }
        Write-Host ('[OK]   Login admin (' + $TenantCode + ')') -ForegroundColor Green
        $passed++
    }
    catch {
        Write-Host ('[FAIL] Login admin - ' + $_.Exception.Message) -ForegroundColor Red
        $failed += 'Login'
        Write-Host "=== ABORT: cannot login ===" -ForegroundColor Red
        exit 1
    }
}

$from = (Get-Date).AddDays(-30).ToString('yyyy-MM-dd')
$to = (Get-Date).ToString('yyyy-MM-dd')

Write-Group '1. Sales'
Test-Api 'S1' 'POS settings receipt' '/api/sales/settings/receipt'
Test-Api 'S2' 'POS settings batch-mode' '/api/sales/settings/batch-mode'
Test-Api 'S3' 'Sales orders list' '/api/sales/orders?page=1&pageSize=5'
Test-Api 'S4' 'Customer draft orders' '/api/sales/customer-draft-orders'
Test-Api 'S5' 'Customer reservations' '/api/sales/customer-reservations'
Test-Api 'S6' 'Sales returns list' '/api/sales/returns?page=1&pageSize=5'
Test-Api 'S7' 'Customer chat threads' '/api/sales/customer-chat/threads'
Test-Api 'S8' 'Warehouses for shift' '/api/inventory/warehouses' -Assert {
    param($r)
    $list = @($r)
    if ($list.Count -lt 1) { throw 'no warehouse' }
    $script:warehouseId = $list[0].id
    if (-not $script:warehouseId) { $script:warehouseId = $list[0].Id }
}
if ($script:warehouseId) {
    $shiftPath = '/api/sales/shifts/current?warehouseId=' + $script:warehouseId
    Test-Api 'S9' 'Shift current' $shiftPath -Optional
}
Test-Api 'S10' 'Shift list' '/api/sales/shifts?limit=10'
$summaryPath = '/api/sales/shift-summary?from=' + $from + '&to=' + $to
Test-Api 'S11' 'Shift summary' $summaryPath

Write-Group '2. Procurement'
Test-Api 'P1' 'Suppliers' '/api/procurement/suppliers?page=1&pageSize=5'
Test-Api 'P2' 'Purchase orders' '/api/procurement/purchase-orders?page=1&pageSize=5'
Test-Api 'P3' 'Goods receipts' '/api/procurement/goods-receipts?page=1&pageSize=5'
Test-Api 'P4' 'VAT treatments' '/api/procurement/vat-treatments'

Write-Group '3. Inventory'
Test-Api 'I1' 'Opening balance batches' '/api/inventory/opening-balance/batches?page=1&pageSize=5'
Test-Api 'I2' 'Stock products' '/api/inventory/stock/products?page=1&pageSize=5'
Test-Api 'I3' 'Stock batches' '/api/inventory/stock/batches?page=1&pageSize=5'
Test-Api 'I4' 'Low stock' '/api/inventory/stock/low-stock'
Test-Api 'I5' 'Transfers' '/api/inventory/transfers?page=1&pageSize=5'
Test-Api 'I6' 'Adjustments' '/api/inventory/adjustments?page=1&pageSize=5'
Test-Api 'I7' 'Warehouses list' '/api/inventory/warehouses'
Test-Api 'I8' 'Low stock settings' '/api/inventory/low-stock/settings'
Test-Api 'I9' 'GPP checklist' '/api/inventory/gpp-checklist'

Write-Group '4. Receivables'
Test-Api 'R1' 'Customer receivables' '/api/sales/customer-receivables?page=1&pageSize=5'
Test-Api 'R2' 'Customer payments' '/api/sales/customer-payments?page=1&pageSize=5'
Test-Api 'R3' 'Supplier payables' '/api/procurement/supplier-payables'
Test-Api 'R4' 'Supplier payments' '/api/procurement/supplier-payments?page=1&pageSize=5'

Write-Group '5. Customers'
Test-Api 'C1' 'Customers list' '/api/customers?page=1&pageSize=5'
Test-Api 'C2' 'Customer engagement' '/api/customer-engagement/overview?periodDays=30'
Test-Api 'C3' 'Loyalty settings' '/api/loyalty/settings'
Test-Api 'C4' 'Vouchers' '/api/loyalty/vouchers?page=1&pageSize=5'

Write-Group '6. Catalog'
Test-Api 'K1' 'Products' '/api/catalog/products?page=1&pageSize=5'
Test-Api 'K2' 'Categories' '/api/catalog/categories'
Test-Api 'K3' 'Brands' '/api/catalog/brands'
Test-Api 'K4' 'Active ingredients' '/api/catalog/ingredients'
Test-Api 'K5' 'National drugs search' '/api/catalog/national-drugs?search=para&limit=5'
Test-Api 'K6' 'Bulk SĐK suggest' '/api/catalog/products/bulk-suggest-national-registration?limit=5' -Method POST -Optional

Write-Group '7. Reports'
Test-Api 'B1' 'Reports catalog' '/api/reports/catalog'
Test-Api 'B2' 'Sales revenue by period' ('/api/reports/sales/revenue-by-period?from=' + $from + '&to=' + $to)
Test-Api 'B3' 'Sales revenue by payment' ('/api/reports/sales/revenue-by-payment-method?from=' + $from + '&to=' + $to)
Test-Api 'B4' 'Sales shifts report' ('/api/reports/sales/shifts?from=' + $from + '&to=' + $to)
Test-Api 'B5' 'Procurement GRN value' ('/api/reports/procurement/grn-value?from=' + $from + '&to=' + $to)
Test-Api 'B6' 'Procurement payables snapshot' '/api/reports/procurement/payables-snapshot'
Test-Api 'B7' 'Inventory stock snapshot' '/api/reports/inventory/stock-snapshot'
Test-Api 'B8' 'Inventory near expiry' '/api/reports/inventory/near-expiry?days=90'

Write-Group '8. System'
Test-Api 'X1' 'Branches' '/api/system/branches'
Test-Api 'X2' 'Users' '/api/system/users'
Test-Api 'X3' 'Roles' '/api/system/roles'
Test-Api 'X4' 'Tenant platform' '/api/system/tenant-platform'
Test-Api 'X5' 'Platform modules' '/api/system/tenant-platform/modules'
Test-Api 'X6' 'Receipt settings' '/api/sales/settings/receipt'
Test-Api 'X7' 'Customer app settings' '/api/sales/settings/customer-app'
Test-Api 'X8' 'Audit log' '/api/system/audit-log?page=1&pageSize=5'
Test-Api 'X9' 'Dashboard overview' '/api/dashboard/overview'

Write-Host ""
Write-Host ('=== RESULT: ' + $passed + ' OK | ' + $failed.Count + ' FAIL | ' + $warn.Count + ' SKIP ===') -ForegroundColor Cyan
if ($failed.Count -gt 0) {
    Write-Host 'FAIL:' -ForegroundColor Red
    $failed | ForEach-Object { Write-Host ('  - ' + $_) -ForegroundColor Red }
    exit 1
}
exit 0
