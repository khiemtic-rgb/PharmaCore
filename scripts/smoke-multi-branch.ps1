# Smoke test: tenant isolation + branch scoping across modules
$ErrorActionPreference = "Stop"
$Base = "http://localhost:5290"
$Tenant = "DEMO_PHARMACY"
$scopeUser = "quay_smoke"
$scopeRoleCode = "QUAY_SMOKE"
$scopePassword = "Quay@Smoke1"

function Invoke-Api {
    param(
        [string]$Method = "GET",
        [string]$Path,
        [object]$Body = $null,
        [string]$Token = $null
    )
    $headers = @{ Accept = "application/json" }
    if ($Token) { $headers.Authorization = "Bearer $Token" }
    $uri = "$Base$Path"
    if ($Body) {
        $json = ($Body | ConvertTo-Json -Depth 10 -Compress)
        $resp = Invoke-WebRequest -Method $Method -Uri $uri -Headers $headers -ContentType "application/json" -Body $json -UseBasicParsing
    }
    else {
        $resp = Invoke-WebRequest -Method $Method -Uri $uri -Headers $headers -UseBasicParsing
    }
    if ([string]::IsNullOrWhiteSpace($resp.Content)) { return $null }
    return ($resp.Content | ConvertFrom-Json)
}

function Get-StatusCode {
    param([string]$Method, [string]$Path, [string]$Token, [object]$Body = $null)
    try {
        $headers = @{ Accept = "application/json" }
        if ($Token) { $headers.Authorization = "Bearer $Token" }
        if ($Body) {
            $json = ($Body | ConvertTo-Json -Depth 10 -Compress)
            Invoke-WebRequest -Method $Method -Uri "$Base$Path" -Headers $headers -ContentType "application/json" -Body $json -UseBasicParsing | Out-Null
        }
        else {
            Invoke-WebRequest -Method $Method -Uri "$Base$Path" -Headers $headers -UseBasicParsing | Out-Null
        }
        return 200
    }
    catch {
        if ($_.Exception.Response) { return [int]$_.Exception.Response.StatusCode }
        return 0
    }
}

function Test-Blocked {
    param([int]$StatusCode)
    return $StatusCode -eq 401 -or $StatusCode -eq 403
}

function Test-PlatformBlocked {
    param([int]$StatusCode)
    return $StatusCode -eq 400 -or $StatusCode -eq 401 -or $StatusCode -eq 403
}

function Get-One {
    param([object]$Value)
    if ($null -eq $Value) { return $null }
    $arr = @($Value)
    if ($arr.Count -eq 0) { return $null }
    return $arr[0]
}

function Ensure-AdminUnrestricted {
    param([string]$AdminToken)
    $users = Invoke-Api -Path '/api/system/users?page=1&pageSize=100' -Token $AdminToken
    $admin = Get-One ($users.items | Where-Object { $_.username -eq "admin" })
    if (-not $admin) { throw "Admin user not found" }

    $detail = Invoke-Api -Path "/api/system/users/$($admin.id)" -Token $AdminToken
    Invoke-Api -Method PUT -Path "/api/system/users/$($admin.id)" -Token $AdminToken -Body @{
        username  = $detail.username
        email     = $detail.email
        status    = $detail.status
        roleIds   = @($detail.roleIds)
        branchIds = @()
    } | Out-Null
}

function Ensure-WarehouseForBranch {
    param(
        [string]$AdminToken,
        [object]$Branch,
        [string]$WarehouseCode
    )
    $branchId = [string]$Branch.id
    $warehouses = @(Invoke-Api -Path "/api/inventory/warehouses" -Token $AdminToken)
    $existing = Get-One ($warehouses | Where-Object {
        $_.warehouseCode -eq $WarehouseCode -or $_.branchId -eq $branchId
    })
    if ($existing) { return $existing }

    try {
        return Invoke-Api -Method POST -Path "/api/inventory/warehouses" -Token $AdminToken -Body @{
            branchId      = $branchId
            warehouseCode = $WarehouseCode
            warehouseName = "Kho $WarehouseCode smoke"
            warehouseType = 1
            isDefault     = $false
            status        = 1
        }
    }
    catch {
        $warehouses = @(Invoke-Api -Path "/api/inventory/warehouses" -Token $AdminToken)
        return Get-One ($warehouses | Where-Object {
            $_.warehouseCode -eq $WarehouseCode -or $_.branchId -eq $branchId
        })
    }
}

$results = @()

function Add-Result($Name, $Ok, $Detail) {
    $script:results += [pscustomobject]@{ Test = $Name; Ok = $Ok; Detail = $Detail }
    $color = if ($Ok) { "Green" } else { "Red" }
    $mark = if ($Ok) { "PASS" } else { "FAIL" }
    Write-Host "[$mark] $Name - $Detail" -ForegroundColor $color
}

function Ensure-ScopeRole {
    param([string]$AdminToken)
    $roles = @(Invoke-Api -Path "/api/system/roles" -Token $AdminToken)
    $role = Get-One ($roles | Where-Object { $_.roleCode -eq $scopeRoleCode })
    if (-not $role) {
        $role = Invoke-Api -Method POST -Path "/api/system/roles" -Token $AdminToken -Body @{
            roleCode = $scopeRoleCode
            roleName = "Thu ngan smoke"
            status   = 1
        }
    }

    $perms = @(Invoke-Api -Path "/api/system/permissions" -Token $AdminToken)
    $permCodes = $perms | Where-Object {
        $_.permissionCode -in @(
            "sales.read", "sales.write",
            "inventory.read", "inventory.write",
            "procurement.read", "procurement.write",
            "catalog.read", "reports.read"
        )
    } | ForEach-Object { $_.permissionCode }

    Invoke-Api -Method PUT -Path "/api/system/roles/$($role.id)/permissions" -Token $AdminToken -Body @{
        permissionCodes = @($permCodes)
    } | Out-Null

    return @{ Role = $role; PermCount = @($permCodes).Count }
}

function Ensure-ScopeUser {
    param([string]$AdminToken, [object]$Branch1, [object]$ScopeRole)
    $users = Invoke-Api -Path '/api/system/users?page=1&pageSize=100' -Token $AdminToken
    $existing = Get-One ($users.items | Where-Object { $_.username -eq $scopeUser })

    if ($existing) {
        $updateBody = @{
            username         = $scopeUser
            email            = "quay.smoke@demo.KitPlatform.vn"
            status           = 1
            roleIds          = @($ScopeRole.id)
            employeeFullName = "Thu ngan Smoke"
            employeePhone    = "0909111222"
            branchIds        = @($Branch1.id)
            primaryBranchId  = $Branch1.id
        }
        Invoke-Api -Method PUT -Path "/api/system/users/$($existing.id)" -Token $AdminToken -Body $updateBody | Out-Null
        return $existing.id
    }

    $created = Invoke-Api -Method POST -Path "/api/system/users" -Token $AdminToken -Body @{
        username         = $scopeUser
        email            = "quay.smoke@demo.KitPlatform.vn"
        password         = $scopePassword
        status           = 1
        roleIds          = @($ScopeRole.id)
        employeeFullName = "Thu ngan Smoke"
        employeePhone    = "0909111222"
        branchIds        = @($Branch1.id)
        primaryBranchId  = $Branch1.id
    }
    return $created.id
}

Write-Host "=== KitPlatform smoke: multi-branch readiness ===" -ForegroundColor Cyan

try {
    $health = Invoke-Api -Path "/api/health"
    Add-Result "Health" ($health.status -eq "ok") "status=$($health.status)"
}
catch {
    Add-Result "Health" $false $_.Exception.Message
    exit 1
}

$adminLogin = Invoke-Api -Method POST -Path "/api/auth/login" -Body @{
    username   = "admin"
    password   = "Admin@123"
    tenantCode = $Tenant
}
$adminToken = $adminLogin.accessToken
Add-Result "Admin login" ([bool]$adminToken) "tenant=$Tenant"

Ensure-AdminUnrestricted -AdminToken $adminToken
Add-Result "Admin unrestricted" $true "cleared employee_branches"

$branches = @(Invoke-Api -Path "/api/system/branches" -Token $adminToken)
$branch1 = Get-One ($branches | Where-Object { $_.branchCode -eq "HN01" })
if (-not $branch1) { $branch1 = Get-One $branches }

$branch2 = Get-One ($branches | Where-Object { $_.branchCode -eq "CN02" })
if (-not $branch2) {
    $branch2 = Invoke-Api -Method POST -Path "/api/system/branches" -Token $adminToken -Body @{
        branchCode   = "CN02"
        branchName   = "Chi nhanh CN02 smoke"
        address      = "Smoke test"
        isHeadOffice = $false
        status       = 1
    }
    Add-Result "Create branch CN02" ($null -ne $branch2.id) "id=$($branch2.id)"
}
else {
    Add-Result "Branch CN02 exists" $true "id=$($branch2.id)"
}

$wh2 = Ensure-WarehouseForBranch -AdminToken $adminToken -Branch $branch2 -WarehouseCode "WH_CN02"
Add-Result "Warehouse CN02 ready" ($null -ne $wh2.id) "id=$($wh2.id)"

if (-not $wh2) {
    Add-Result "Warehouse CN02 required" $false "missing"
    exit 1
}

$roleInfo = Ensure-ScopeRole -AdminToken $adminToken
Add-Result "Scope role permissions" ($roleInfo.PermCount -ge 7) "perms=$($roleInfo.PermCount)"

$null = Ensure-ScopeUser -AdminToken $adminToken -Branch1 $branch1 -ScopeRole $roleInfo.Role
Add-Result "Scope user ready" $true $scopeUser

$scopeLogin = Invoke-Api -Method POST -Path "/api/auth/login" -Body @{
    username   = $scopeUser
    password   = $scopePassword
    tenantCode = $Tenant
}
$scopeToken = $scopeLogin.accessToken
Add-Result "Scoped user login" ([bool]$scopeToken) $scopeUser

$scopeWh = @(Invoke-Api -Path "/api/inventory/warehouses" -Token $scopeToken)
$scopeOnB1 = @($scopeWh | Where-Object { $_.branchId -eq $branch1.id })
$scopeOnB2 = @($scopeWh | Where-Object { $_.branchId -eq $branch2.id })
Add-Result "Warehouses scoped to branch1" (
    $scopeOnB1.Count -ge 1 -and $scopeOnB2.Count -eq 0
) "b1=$($scopeOnB1.Count) b2=$($scopeOnB2.Count)"

$adminWh = @(Invoke-Api -Path "/api/inventory/warehouses" -Token $adminToken)
$adminOnB2 = @($adminWh | Where-Object { $_.branchId -eq $branch2.id })
Add-Result "Admin sees CN02 warehouse" ($adminOnB2.Count -ge 1) "b2=$($adminOnB2.Count)"

$blockedWh = Get-StatusCode -Method GET -Path "/api/inventory/warehouses/$($wh2.id)" -Token $scopeToken
Add-Result "Block foreign warehouse GET" (Test-Blocked $blockedWh) "http=$blockedWh"

$dashScope = Invoke-Api -Path "/api/dashboard/overview" -Token $scopeToken
Add-Result "Dashboard scoped" ($null -ne $dashScope.sales) "todayOrders=$($dashScope.sales.todayOrderCount)"

$salesOrders = Invoke-Api -Path "/api/sales/orders?page=1&pageSize=20" -Token $scopeToken
$salesOrderCount = @($salesOrders.items).Count
Add-Result "Sales orders list" ($null -ne $salesOrders.items) "count=$salesOrderCount total=$($salesOrders.total)"

$po = Invoke-Api -Path "/api/procurement/purchase-orders?page=1&pageSize=20" -Token $scopeToken
$grn = Invoke-Api -Path "/api/procurement/goods-receipts?page=1&pageSize=20" -Token $scopeToken
$poCount = @($po.items).Count
$grnCount = @($grn.items).Count
Add-Result "Procurement lists" ($null -ne $po.items -and $null -ne $grn.items) "po=$poCount/$($po.total) grn=$grnCount/$($grn.total)"

$pay = @(Invoke-Api -Path "/api/procurement/supplier-payments" -Token $scopeToken)
$payables = @(Invoke-Api -Path "/api/procurement/supplier-payables" -Token $scopeToken)
Add-Result "Supplier payments/payables" ($null -ne $pay -and $null -ne $payables) "pay=$($pay.Count) ap=$($payables.Count)"

$catalog = Invoke-Api -Path '/api/catalog/products?page=1&pageSize=5' -Token $scopeToken
Add-Result "Catalog products" ($catalog.total -ge 0) "total=$($catalog.total)"

$reports = @(Invoke-Api -Path "/api/reports/catalog" -Token $scopeToken)
Add-Result "Reports catalog" ($reports.Count -gt 0) "count=$($reports.Count)"

$ls = Invoke-Api -Path "/api/inventory/low-stock/settings" -Token $scopeToken
$lsWh = @($ls.warehouses)
$lsOnB1 = @($lsWh | Where-Object { $_.branchId -eq $branch1.id })
$lsOnB2 = @($lsWh | Where-Object { $_.branchId -eq $branch2.id })
Add-Result "Low-stock settings scoped" (
    $lsOnB1.Count -ge 1 -and $lsOnB2.Count -eq 0
) "b1=$($lsOnB1.Count) b2=$($lsOnB2.Count)"

$blockedLs = Get-StatusCode -Method PUT -Path "/api/inventory/low-stock/settings/warehouses/$($wh2.id)" -Token $scopeToken -Body @{ minStockQty = 5 }
Add-Result "Block foreign low-stock update" (Test-Blocked $blockedLs) "http=$blockedLs"

$adminDrafts = Invoke-Api -Path "/api/sales/customer-draft-orders" -Token $adminToken
$scopeDrafts = Invoke-Api -Path "/api/sales/customer-draft-orders" -Token $scopeToken
$adminDraftCount = @($adminDrafts.items).Count
$scopeDraftCount = @($scopeDrafts.items).Count
Add-Result "O2O drafts scoped count" (
    $scopeDraftCount -le $adminDraftCount
) "scoped=$scopeDraftCount admin=$adminDraftCount"

$adminRes = Invoke-Api -Path "/api/sales/customer-reservations" -Token $adminToken
$scopeRes = Invoke-Api -Path "/api/sales/customer-reservations" -Token $scopeToken
$adminResCount = @($adminRes.items).Count
$scopeResCount = @($scopeRes.items).Count
Add-Result "O2O reservations scoped count" (
    $scopeResCount -le $adminResCount
) "scoped=$scopeResCount admin=$adminResCount"

$chatCustomerB2 = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa02"
$smokeProductId = "66666666-6666-6666-6666-666666666604"
$smokeUnitId = "77777777-7777-7777-7777-777777777705"
try {
    Invoke-Api -Method POST -Path "/api/sales/customer-draft-orders" -Token $adminToken -Body @{
        customerId  = $chatCustomerB2
        warehouseId = $wh2.id
        priceType   = 1
        items       = @(@{
            productId     = $smokeProductId
            productUnitId = $smokeUnitId
            quantity      = 1
        })
    } | Out-Null
    Invoke-Api -Method POST -Path "/api/sales/customer-chat/threads/$chatCustomerB2/messages" -Token $adminToken -Body @{
        body = "Smoke chat CN02"
    } | Out-Null
    Add-Result "Chat thread CN02 setup" $true "customer=$chatCustomerB2"
}
catch {
    Add-Result "Chat thread CN02 setup" $false $_.Exception.Message
}

$adminChat = Invoke-Api -Path "/api/sales/customer-chat/threads" -Token $adminToken
$scopeChat = Invoke-Api -Path "/api/sales/customer-chat/threads" -Token $scopeToken
$adminChatCount = @($adminChat.items).Count
$scopeChatCount = @($scopeChat.items).Count
$scopeHasB2 = @($scopeChat.items | Where-Object { $_.customerId -eq $chatCustomerB2 }).Count -gt 0
Add-Result "O2O chat scoped count" (
    $scopeChatCount -le $adminChatCount -and -not $scopeHasB2
) "scoped=$scopeChatCount admin=$adminChatCount b2visible=$scopeHasB2"

$blockedChat = Get-StatusCode -Method GET -Path "/api/sales/customer-chat/threads/$chatCustomerB2/messages" -Token $scopeToken
Add-Result "Block foreign chat thread" (Test-Blocked $blockedChat) "http=$blockedChat"

$adminUser = Get-One ((Invoke-Api -Path '/api/system/users?page=1&pageSize=100' -Token $adminToken).items | Where-Object { $_.username -eq "admin" })
$adminDetail = Invoke-Api -Path "/api/system/users/$($adminUser.id)" -Token $adminToken
if ($adminDetail.employeeId) {
    try {
        Invoke-Api -Method PUT -Path "/api/system/employees/$($adminDetail.employeeId)/branches" -Token $adminToken -Body @{
            branchIds = @()
        } | Out-Null
        Add-Result "Employee branches API" $true "PUT ok"
    }
    catch {
        Add-Result "Employee branches API" $false $_.Exception.Message
    }
}
else {
    Add-Result "Employee branches API" $true "no employee linked"
}

try {
    Invoke-Api -Method POST -Path "/api/platform/tenants" -Body @{
        tenantCode    = "SMOKE_X"
        tenantName    = "x"
        adminUsername = "a"
        adminPassword = "Password123!"
    }
    Add-Result "Platform without key blocked" $false "unexpected success"
}
catch {
    $code = 0
    if ($_.Exception.Response) { $code = [int]$_.Exception.Response.StatusCode }
    Add-Result "Platform without key blocked" (Test-PlatformBlocked $code) "http=$code"
}

try {
    Invoke-Api -Method POST -Path "/api/auth/login" -Body @{
        username   = "admin"
        password   = "Admin@123"
        tenantCode = "NONEXIST_TENANT_X"
    } | Out-Null
    Add-Result "Bad tenant rejected" $false "unexpected success"
}
catch {
    Add-Result "Bad tenant rejected" $true "login failed"
}

Write-Host ""
Write-Host "=== Summary ===" -ForegroundColor Cyan
$passed = @($results | Where-Object { $_.Ok }).Count
$failed = @($results | Where-Object { -not $_.Ok }).Count
Write-Host "Passed: $passed / $($results.Count)  Failed: $failed"
if ($failed -gt 0) {
    $results | Where-Object { -not $_.Ok } | Format-Table -AutoSize
    exit 1
}
exit 0

