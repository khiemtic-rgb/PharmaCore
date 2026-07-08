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
        if ($_.ErrorDetails.Message) { Write-Host "       $($_.ErrorDetails.Message)" -ForegroundColor DarkRed }
        $script:failed += $Name
    }
}

function Invoke-Api {
    param(
        [string]$Method = 'GET',
        [string]$Path,
        [object]$Body = $null,
        [hashtable]$Headers = @{},
        [switch]$ExpectFailure
    )
    $uri = "$base$Path"
    $params = @{ Method = $Method; Headers = $Headers; ContentType = 'application/json' }
    if ($Body -ne $null) { $params.Body = ($Body | ConvertTo-Json -Depth 10 -Compress) }
    try {
        return Invoke-RestMethod @params -Uri $uri
    }
    catch {
        if ($ExpectFailure) {
            $body = $null
            if ($_.Exception.Response -and $_.Exception.Response.GetResponseStream()) {
                $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
                $body = $reader.ReadToEnd()
                $reader.Close()
            }
            if ($body) {
                try {
                    $parsed = $body | ConvertFrom-Json
                    if ($parsed.message) { return [string]$parsed.message }
                    if ($parsed.title) { return [string]$parsed.title }
                }
                catch { return $body }
                return $body
            }
            if ($_.ErrorDetails.Message) { return $_.ErrorDetails.Message }
            return $_.Exception.Message
        }
        throw
    }
}

function Coalesce([object]$Value, [object]$Fallback) {
    if ($null -eq $Value) { return $Fallback }
    return $Value
}

$customerCreditId = '5367421e-573a-4681-b41f-286253570dd9'
$customerNoCreditId = 'b1df9211-5680-431a-910e-9b51be2cdfc6'
$warehouseId = '263dd17e-eef3-4d90-85ff-9ad4fec90a11'
$productId = 'bb309c75-2b2e-48a9-8064-327e66c42152'
$unitId = '36c1bcd1-db3e-4b8c-b2b5-0a16fd21edc8'

Write-Host "`n=== UAT POS Credit - $tenantCode ===" -ForegroundColor Cyan

Test-Step 'Login admin' {
    $loginBody = @{ username = 'admin'; password = 'Admin@123'; tenantCode = $tenantCode }
    $script:auth = Invoke-Api -Method POST -Path '/api/auth/login' -Body $loginBody
    if (-not $script:auth.accessToken) { throw 'no token' }
    $script:H = @{ Authorization = "Bearer $($script:auth.accessToken)" }
}

Test-Step 'Enable credit for Khach Xuan Hoa' {
    $cust = Invoke-Api -Path "/api/customers/$customerCreditId" -Headers $script:H
    if ($cust.allowCredit) { return }
    Invoke-Api -Method PUT -Path "/api/customers/$customerCreditId" -Headers $script:H -Body @{
        fullName = $cust.fullName
        phone = $cust.phone
        customerCode = $cust.customerCode
        status = [int]$cust.status
        allowCredit = $true
        creditLimit = 5000000
    } | Out-Null
    $updated = Invoke-Api -Path "/api/customers/$customerCreditId" -Headers $script:H
    if (-not $updated.allowCredit) { throw 'allowCredit not saved' }
}

Test-Step 'POS search customer returns credit fields' {
    $list = Invoke-Api -Path '/api/sales/customers?search=Xuan' -Headers $script:H
    $kh = $list | Where-Object { $_.id -eq $customerCreditId } | Select-Object -First 1
    if (-not $kh) { throw 'customer not in search' }
    if (-not $kh.allowCredit) { throw 'allowCredit missing in search' }
}

Test-Step 'Ensure open shift' {
    try {
        $script:shift = Invoke-Api -Path "/api/sales/shifts/current?warehouseId=$warehouseId" -Headers $script:H
    }
    catch {
        $script:shift = Invoke-Api -Method POST -Path '/api/sales/shifts/open' -Headers $script:H -Body @{
            warehouseId = $warehouseId
            openingCash = 0
        }
    }
    if (-not $script:shift.id) { throw 'no shift' }
}

function New-SaleLine {
    return @{
        productId = $productId
        productUnitId = $unitId
        quantity = 1
    }
}

function Get-OrderDetail([string]$OrderId) {
    Invoke-Api -Path "/api/sales/orders/$OrderId" -Headers $script:H
}

Test-Step 'Reject partial pay without customer' {
    $err = Invoke-Api -Method POST -Path '/api/sales/orders' -Headers $script:H -Body @{
        warehouseId = $warehouseId
        customerId = $null
        priceType = 1
        items = @(New-SaleLine)
        payments = @(@{ paymentMethod = 1; amount = 5000 })
        saveAsDraft = $false
    } -ExpectFailure
    if (-not $err) { throw 'expected validation error' }
}

Test-Step 'Reject partial pay customer without allow_credit' {
    $err = Invoke-Api -Method POST -Path '/api/sales/orders' -Headers $script:H -Body @{
        warehouseId = $warehouseId
        customerId = $customerNoCreditId
        priceType = 1
        items = @(New-SaleLine)
        payments = @(@{ paymentMethod = 1; amount = 5000 })
        saveAsDraft = $false
    } -ExpectFailure
    if (-not $err) { throw 'expected validation error' }
}

Test-Step 'Partial pay and outstanding' {
    $created = Invoke-Api -Method POST -Path '/api/sales/orders' -Headers $script:H -Body @{
        warehouseId = $warehouseId
        customerId = $customerCreditId
        priceType = 1
        items = @(New-SaleLine)
        payments = @(@{ paymentMethod = 1; amount = 5000 })
        saveAsDraft = $false
    }
    $script:partialOrderId = $created.id
    $detail = Get-OrderDetail $script:partialOrderId
    if ($detail.amountPaid -lt 4999 -or $detail.amountPaid -gt 5001) { throw "amountPaid=$($detail.amountPaid)" }
    if ($detail.outstanding -le 0) { throw "expected outstanding positive, got $($detail.outstanding)" }
    if ([math]::Abs($detail.amountPaid + $detail.outstanding - $detail.totalAmount) -gt 0.02) {
        throw 'paid plus outstanding not equal total'
    }
    $script:partialDetail = $detail
}

Test-Step 'Loyalty earn only on amount_paid' {
    $detail = $script:partialDetail
    $earn = [int](Coalesce $detail.loyaltyPointsEarned 0)
    $expectedMax = [int][math]::Floor($detail.amountPaid / 10000)
    if ($earn -gt $expectedMax) { throw "earned $earn exceeds max $expectedMax" }
    if ($detail.amountPaid -ge 10000 -and $earn -le 0) { throw 'expected points when paid >= 10000' }
}

Test-Step 'Full credit pay zero' {
    $created = Invoke-Api -Method POST -Path '/api/sales/orders' -Headers $script:H -Body @{
        warehouseId = $warehouseId
        customerId = $customerCreditId
        priceType = 1
        items = @(New-SaleLine)
        payments = @()
        saveAsDraft = $false
    }
    $detail = Get-OrderDetail $created.id
    if ($detail.amountPaid -gt 0.01) { throw "amountPaid=$($detail.amountPaid)" }
    if ($detail.outstanding -le 0) { throw "outstanding=$($detail.outstanding)" }
    if ((Coalesce $detail.loyaltyPointsEarned 0) -gt 0) { throw 'should not earn on full credit' }
    $script:fullCreditDetail = $detail
}

Test-Step 'Full pay baseline' {
    $created = Invoke-Api -Method POST -Path '/api/sales/orders' -Headers $script:H -Body @{
        warehouseId = $warehouseId
        customerId = $customerCreditId
        priceType = 1
        items = @(New-SaleLine)
        saveAsDraft = $false
    }
    $detail = Get-OrderDetail $created.id
    if ($detail.outstanding -gt 0.01) { throw "outstanding=$($detail.outstanding)" }
    if ([math]::Abs($detail.amountPaid - $detail.totalAmount) -gt 0.02) { throw 'amountPaid not equal total' }
}

Test-Step 'Customer currentOutstanding in search' {
    $list = Invoke-Api -Path '/api/sales/customers?search=Xuan' -Headers $script:H
    $kh = $list | Where-Object { $_.id -eq $customerCreditId } | Select-Object -First 1
    if ($kh.currentOutstanding -le 0) { throw "currentOutstanding=$($kh.currentOutstanding)" }
}

Write-Host "`n=== Result: $passed OK, $($failed.Count) FAIL ===" -ForegroundColor Cyan
if ($failed.Count -gt 0) {
    $failed | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
    exit 1
}
Write-Host "Partial: $($script:partialDetail.orderNumber)" -ForegroundColor DarkGray
Write-Host "Full credit: $($script:fullCreditDetail.orderNumber)" -ForegroundColor DarkGray

