<#
.SYNOPSIS
  Buoc 4 quy trinh 10x10: tao role thu ngan + user gan tung chi nhanh.

.EXAMPLE
  .\scripts\bootstrap-tenant-staff.ps1
  .\scripts\bootstrap-tenant-staff.ps1 -BranchCodes HN01,CN02,CN03 -StaffPassword "Pilot@2026!"
#>
param(
    [string]$Base = "http://localhost:5290",
    [string]$TenantCode = "DEMO_PHARMACY",
    [string]$AdminUsername = "admin",
    [string]$AdminPassword = "Admin@123",
    [string]$RoleCode = "QUAY",
    [string]$RoleName = "Thu ngan",
    [string]$UserPrefix = "quay",
    [string]$StaffPassword = "Quay@Branch1",
    [string[]]$BranchCodes = @(),
    [switch]$SkipHeadOffice,
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

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

function Get-One {
    param([object]$Value)
    if ($null -eq $Value) { return $null }
    $arr = @($Value)
    if ($arr.Count -eq 0) { return $null }
    return $arr[0]
}

function Ensure-QuayRole {
    param([string]$Token)
    $roles = @(Invoke-Api -Path "/api/system/roles" -Token $Token)
    $role = Get-One ($roles | Where-Object { $_.roleCode -eq $RoleCode })
    if (-not $role) {
        $role = Invoke-Api -Method POST -Path "/api/system/roles" -Token $Token -Body @{
            roleCode = $RoleCode
            roleName = $RoleName
            status   = 1
        }
    }
    $perms = @(Invoke-Api -Path "/api/system/permissions" -Token $Token)
    $permCodes = $perms | Where-Object {
        $_.permissionCode -in @(
            "sales.read", "sales.write",
            "inventory.read", "inventory.write",
            "procurement.read", "procurement.write",
            "catalog.read", "reports.read"
        )
    } | ForEach-Object { $_.permissionCode }
    Invoke-Api -Method PUT -Path "/api/system/roles/$($role.id)/permissions" -Token $Token -Body @{
        permissionCodes = @($permCodes)
    } | Out-Null
    return $role
}

function Ensure-WarehouseForBranch {
    param([string]$Token, [object]$Branch)
    $branchId = [string]$Branch.id
    $code = [string]$Branch.branchCode
    $whCode = "WH_$code"
    $warehouses = @(Invoke-Api -Path "/api/inventory/warehouses" -Token $Token)
    $existing = Get-One ($warehouses | Where-Object {
        $_.branchId -eq $branchId -or $_.warehouseCode -eq $whCode
    })
    if ($existing) { return $existing }

    if ($DryRun) {
        Write-Host "[dry-run] warehouse $whCode for $code" -ForegroundColor Cyan
        return $null
    }

    return Invoke-Api -Method POST -Path "/api/inventory/warehouses" -Token $Token -Body @{
        branchId      = $branchId
        warehouseCode = $whCode
        warehouseName = "Kho $code"
        warehouseType = 1
        isDefault     = $false
        status        = 1
    }
}

function Ensure-BranchUser {
    param(
        [string]$Token,
        [object]$Branch,
        [object]$Role
    )
    $code = [string]$Branch.branchCode
    $username = "{0}_{1}" -f $UserPrefix, ($code.ToLower())
    $email = "{0}.{1}@staff.demo.pharmacore.vn" -f $UserPrefix, ($code.ToLower())

    $users = Invoke-Api -Path '/api/system/users?page=1&pageSize=500' -Token $Token
    $existing = Get-One ($users.items | Where-Object { $_.username -eq $username })

    $body = @{
        username         = $username
        email            = $email
        status           = 1
        roleIds          = @($Role.id)
        employeeFullName = "Thu ngan $code"
        employeePhone    = "0909111222"
        branchIds        = @($Branch.id)
        primaryBranchId  = $Branch.id
    }

    if ($DryRun) {
        Write-Host "[dry-run] $username -> $code" -ForegroundColor Cyan
        return $username
    }

    if ($existing) {
        Invoke-Api -Method PUT -Path "/api/system/users/$($existing.id)" -Token $Token -Body $body | Out-Null
        Write-Host "[update] $username -> $code" -ForegroundColor Yellow
    }
    else {
        Invoke-Api -Method POST -Path "/api/system/users" -Token $Token -Body (@{
            username         = $body.username
            email            = $body.email
            password         = $StaffPassword
            status           = $body.status
            roleIds          = $body.roleIds
            employeeFullName = $body.employeeFullName
            employeePhone    = $body.employeePhone
            branchIds        = $body.branchIds
            primaryBranchId  = $body.primaryBranchId
        }) | Out-Null
        Write-Host "[create] $username -> $code" -ForegroundColor Green
    }
    return $username
}

Write-Host "=== Bootstrap staff: $TenantCode ===" -ForegroundColor Cyan

$login = Invoke-Api -Method POST -Path "/api/auth/login" -Body @{
    username   = $AdminUsername
    password   = $AdminPassword
    tenantCode = $TenantCode
}
$token = $login.accessToken
if (-not $token) { throw "Admin login failed" }

$role = Ensure-QuayRole -Token $token
$branches = @(Invoke-Api -Path "/api/system/branches" -Token $token)
if ($BranchCodes.Count -gt 0) {
    $branches = @($branches | Where-Object { $BranchCodes -contains $_.branchCode })
}
if ($SkipHeadOffice) {
    $branches = @($branches | Where-Object { -not $_.isHeadOffice })
}

$created = @()
foreach ($b in $branches) {
    $null = Ensure-WarehouseForBranch -Token $token -Branch $b
    $created += Ensure-BranchUser -Token $token -Branch $b -Role $role
}

Write-Host "=== Done: $($created.Count) staff user(s), role=$RoleCode, password=$StaffPassword ===" -ForegroundColor Green
