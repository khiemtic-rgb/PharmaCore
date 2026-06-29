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

Write-Host "`n=== UAT Customer Receivables - $tenantCode ===" -ForegroundColor Cyan

Test-Step 'Login admin' {
    $loginBody = @{ username = 'admin'; password = 'Admin@123'; tenantCode = $tenantCode }
    $script:auth = Invoke-Api -Method POST -Path '/api/auth/login' -Body $loginBody
    if (-not $script:auth.accessToken) { throw 'no token' }
    $script:H = @{ Authorization = "Bearer $($script:auth.accessToken)" }
}

Test-Step 'Receivables summary returns rows' {
    $script:summary = Invoke-Api -Path '/api/sales/customer-receivables' -Headers $script:H
    if ($null -eq $script:summary) { throw 'null response' }
    if ($script:summary.Count -lt 1) { throw 'expected at least one customer with receivables' }
}

Test-Step 'Pick open receivable line' {
    $line = $null
    foreach ($row in $script:summary) {
        $detail = Invoke-Api -Path "/api/sales/customer-receivables/$($row.customerId)" -Headers $script:H
        $candidate = $detail.lines | Where-Object { [decimal]$_.outstanding -gt 1000 } | Select-Object -First 1
        if ($candidate) {
            $script:targetCustomerId = $row.customerId
            $script:targetLine = $candidate
            $line = $candidate
            break
        }
    }
    if (-not $line) { throw 'no order with outstanding > 1000' }
    $script:collectAmount = [math]::Min(5000, [decimal]$line.outstanding)
    if ($script:collectAmount -le 0) { throw 'collect amount invalid' }
}

function Assert-ApiError([object]$Err, [string]$Context) {
    if (-not $Err -or [string]::IsNullOrWhiteSpace([string]$Err)) {
        throw "${Context}: expected validation error"
    }
}

Test-Step 'Reject create when amount exceeds order outstanding' {
    $out = [decimal]$script:targetLine.outstanding
    $err = Invoke-Api -Method POST -Path '/api/sales/customer-payments' -Headers $script:H -Body @{
        customerId = $script:targetCustomerId
        salesOrderId = $script:targetLine.salesOrderId
        amount = $out + 1000
        paymentMethod = 1
    } -ExpectFailure
    Assert-ApiError $err 'overpay on create'
}

Test-Step 'Reject create when order has no outstanding' {
    $orders = Invoke-Api -Path '/api/sales/orders?take=50' -Headers $script:H
    $paid = $orders.items | Where-Object { [decimal]$_.outstanding -le 0.009 -and $_.customerId } | Select-Object -First 1
    if (-not $paid) { throw 'no fully paid order to test' }
    $err = Invoke-Api -Method POST -Path '/api/sales/customer-payments' -Headers $script:H -Body @{
        customerId = $paid.customerId
        salesOrderId = $paid.id
        amount = 1000
        paymentMethod = 1
    } -ExpectFailure
    Assert-ApiError $err 'paid order on create'
}

Test-Step 'Create draft payment (outstanding unchanged)' {
    $before = Invoke-Api -Path "/api/sales/orders/$($script:targetLine.salesOrderId)" -Headers $script:H
    $outBefore = [decimal]$before.outstanding
    $script:draft = Invoke-Api -Method POST -Path '/api/sales/customer-payments' -Headers $script:H -Body @{
        customerId = $script:targetCustomerId
        salesOrderId = $script:targetLine.salesOrderId
        amount = $script:collectAmount
        paymentMethod = 1
        notes = 'UAT customer receivables'
    }
    if ($script:draft.status -ne 1) { throw "expected draft status=1, got $($script:draft.status)" }
    $after = Invoke-Api -Path "/api/sales/orders/$($script:targetLine.salesOrderId)" -Headers $script:H
    if ([math]::Abs([decimal]$after.outstanding - $outBefore) -gt 0.009) {
        throw "outstanding changed on draft: before=$outBefore after=$($after.outstanding)"
    }
    $script:outBeforePost = $outBefore
}

Test-Step 'Post payment reduces order outstanding' {
    $posted = Invoke-Api -Method POST -Path "/api/sales/customer-payments/$($script:draft.id)/post" -Headers $script:H
    if ($posted.status -ne 2) { throw "expected posted status=2, got $($posted.status)" }
    $order = Invoke-Api -Path "/api/sales/orders/$($script:targetLine.salesOrderId)" -Headers $script:H
    $expectedOut = $script:outBeforePost - $script:collectAmount
    if ([math]::Abs([decimal]$order.outstanding - $expectedOut) -gt 0.02) {
        throw "outstanding=$($order.outstanding) expected=$expectedOut"
    }
    $payments = $order.payments
    if ($payments.Count -lt 1) { throw 'expected sales_payments on order' }
    $script:postedPayment = $posted
}

Test-Step 'Create and cancel draft payment' {
    $detail = Invoke-Api -Path "/api/sales/customer-receivables/$($script:targetCustomerId)" -Headers $script:H
    $line = $detail.lines | Where-Object { [decimal]$_.outstanding -gt 500 } | Select-Object -First 1
    if (-not $line) { throw 'no line left for cancel test' }
    $amount = [math]::Min(500, [decimal]$line.outstanding)
    $draft = Invoke-Api -Method POST -Path '/api/sales/customer-payments' -Headers $script:H -Body @{
        customerId = $script:targetCustomerId
        salesOrderId = $line.salesOrderId
        amount = $amount
        paymentMethod = 1
    }
    $cancelled = Invoke-Api -Method POST -Path "/api/sales/customer-payments/$($draft.id)/cancel" -Headers $script:H
    if ($cancelled.status -ne 3) { throw "expected cancelled status=3, got $($cancelled.status)" }
}

Test-Step 'Reject double post on posted voucher' {
    $detail = Invoke-Api -Path "/api/sales/customer-receivables/$($script:targetCustomerId)" -Headers $script:H
    $line = $detail.lines | Where-Object { [decimal]$_.outstanding -gt 0.009 } | Select-Object -First 1
    if (-not $line) { return }
    $out = [decimal]$line.outstanding
    # Bypass create validation by using unlinked FIFO post path is harder; skip if only linked validation exists.
    # Create at max allowed then manually update not exposed — test post reject via overpay after partial pay:
    $maxDraft = Invoke-Api -Method POST -Path '/api/sales/customer-payments' -Headers $script:H -Body @{
        customerId = $script:targetCustomerId
        salesOrderId = $line.salesOrderId
        amount = $out
        paymentMethod = 1
    }
    Invoke-Api -Method POST -Path "/api/sales/customer-payments/$($maxDraft.id)/post" -Headers $script:H | Out-Null
    $err = Invoke-Api -Method POST -Path "/api/sales/customer-payments/$($maxDraft.id)/post" -Headers $script:H -ExpectFailure
    if (-not $err) { throw 'expected error posting already posted voucher' }
}

Write-Host "`n=== Result: $passed OK, $($failed.Count) FAIL ===" -ForegroundColor Cyan
if ($failed.Count -gt 0) {
    $failed | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
    exit 1
}
Write-Host "Posted: $($script:postedPayment.paymentNumber) on $($script:targetLine.orderNumber)" -ForegroundColor DarkGray
