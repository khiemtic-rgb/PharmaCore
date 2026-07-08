$ErrorActionPreference = 'Stop'
$base = 'http://localhost:5290'
$tenantCode = 'NT_XUANHOA'

function Invoke-Api {
    param(
        [string]$Method = 'GET',
        [string]$Path,
        [object]$Body = $null,
        [hashtable]$Headers = @{}
    )
    $uri = "$base$Path"
    $params = @{ Method = $Method; Headers = $Headers; ContentType = 'application/json' }
    if ($Body -ne $null) { $params.Body = ($Body | ConvertTo-Json -Depth 10 -Compress) }
    return Invoke-RestMethod @params -Uri $uri
}

Write-Host "=== Cleanup stale customer payment drafts - $tenantCode ===" -ForegroundColor Cyan

$login = Invoke-Api -Method POST -Path '/api/auth/login' -Body @{
    username = 'admin'
    password = 'Admin@123'
    tenantCode = $tenantCode
}
$h = @{ Authorization = "Bearer $($login.accessToken)" }

$drafts = Invoke-Api -Path '/api/sales/customer-payments?status=1' -Headers $h
Write-Host "Draft payments: $($drafts.Count)"

$cancelled = 0
foreach ($draft in $drafts) {
    $shouldCancel = $false
    $reason = ''

    if ($draft.orderNumber -eq 'SO-000015') {
        $shouldCancel = $true
        $reason = 'stale draft on fully paid SO-000015'
    }
    elseif ($draft.orderNumber) {
        $order = Invoke-Api -Path "/api/sales/orders/$($draft.salesOrderId)" -Headers $h
        if ([decimal]$order.outstanding -le 0.009) {
            $shouldCancel = $true
            $reason = "order $($draft.orderNumber) has no outstanding"
        }
    }

    if (-not $shouldCancel) {
        Write-Host "[SKIP] $($draft.paymentNumber) order=$($draft.orderNumber)" -ForegroundColor DarkGray
        continue
    }

    $result = Invoke-Api -Method POST -Path "/api/sales/customer-payments/$($draft.id)/cancel" -Headers $h
    Write-Host "[OK] Cancelled $($draft.paymentNumber) ($reason) -> status=$($result.status)" -ForegroundColor Green
    $cancelled++
}

Write-Host "Cancelled $cancelled draft(s)." -ForegroundColor Cyan

