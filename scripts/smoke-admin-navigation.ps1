$ErrorActionPreference = 'Stop'
$base = 'http://localhost:5290'
$tenantCode = 'NT_XUANHOA'
$passed = 0
$failed = @()

function Test-Step([string]$Name, [scriptblock]$Block) {
    try {
        & $Block
        Write-Host "[OK] $Name" -ForegroundColor Green
        $script:passed++
    }
    catch {
        Write-Host "[FAIL] $Name" -ForegroundColor Red
        Write-Host "       $($_.Exception.Message)" -ForegroundColor DarkRed
        $script:failed += $Name
    }
}

Write-Host "`n=== Admin navigation smoke ($tenantCode) ===" -ForegroundColor Cyan

Test-Step 'Login admin' {
    $script:auth = Invoke-RestMethod "$base/api/auth/login" -Method POST -ContentType 'application/json' `
        -Body (@{ username = 'admin'; password = 'Admin@123'; tenantCode = $tenantCode } | ConvertTo-Json)
    if (-not $script:auth.accessToken) { throw 'no token' }
    $script:h = @{ Authorization = "Bearer $($script:auth.accessToken)" }
}

Test-Step 'Dashboard overview' {
    $d = Invoke-RestMethod "$base/api/dashboard/overview" -Headers $script:h
    if ($null -eq $d.sales) { throw 'missing sales snapshot' }
}

Test-Step 'Sales orders list' {
    Invoke-RestMethod "$base/api/sales/orders?page=1&pageSize=1" -Headers $script:h | Out-Null
}

Test-Step 'Customer receivables' {
    Invoke-RestMethod "$base/api/sales/customer-receivables?page=1&pageSize=1" -Headers $script:h | Out-Null
}

Test-Step 'Procurement purchase orders' {
    Invoke-RestMethod "$base/api/procurement/purchase-orders?page=1&pageSize=1" -Headers $script:h | Out-Null
}

Test-Step 'POS settings' {
    Invoke-RestMethod "$base/api/sales/settings/receipt" -Headers $script:h | Out-Null
}

Test-Step 'Customer app settings' {
    Invoke-RestMethod "$base/api/sales/settings/customer-app" -Headers $script:h | Out-Null
}

Test-Step 'Inventory low stock' {
    Invoke-RestMethod "$base/api/inventory/stock/low-stock" -Headers $script:h | Out-Null
}

Write-Host "`n=== Result: $passed OK, $($failed.Count) FAIL ===" -ForegroundColor Cyan
if ($failed.Count -gt 0) { exit 1 }
