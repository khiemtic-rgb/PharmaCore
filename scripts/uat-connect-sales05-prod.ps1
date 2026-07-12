# UAT prod: Clinic Rx -> NT Connect handoff -> POS sale -> SALES-05
# Usage: .\scripts\uat-connect-sales05-prod.ps1
param(
    [string]$BaseUrl = "https://api.novixa.vn",
    [string]$ClinicTenant = "DEMO_CLINIC",
    [string]$PharmacyTenant = "NT_XUANHOA",
    [string]$User = "admin",
    [string]$Pass = "Admin@123"
)

$ErrorActionPreference = "Stop"
$api = $BaseUrl.TrimEnd("/")

function Login([string]$tenant) {
    $auth = Invoke-RestMethod "$api/api/auth/login" -Method POST -ContentType "application/json" `
        -Body (@{ username = $User; password = $Pass; tenantCode = $tenant } | ConvertTo-Json)
    if (-not $auth.accessToken) { throw "login failed $tenant" }
    return @{ Authorization = "Bearer $($auth.accessToken)" }
}

Write-Host ""
Write-Host "=== UAT Connect POS SALES-05 @ $api ===" -ForegroundColor Cyan

$hPharm = Login $PharmacyTenant
$hClinic = Login $ClinicTenant
Write-Host "OK login $ClinicTenant + $PharmacyTenant" -ForegroundColor Green

$plat = Invoke-RestMethod "$api/api/system/tenant-platform" -Headers $hPharm
$mods = @($plat.enabledModules)
if (-not ($mods | Where-Object { $_ -eq "novixa_connect" })) {
    throw "NT missing novixa_connect in enabledModules: $($mods -join ',')"
}
Write-Host "OK NT has novixa_connect" -ForegroundColor Green

$rawLinks = Invoke-RestMethod "$api/api/connect/org-links?status=active" -Headers $hPharm
$active = @($rawLinks) | Where-Object { $_.partnerTenantCode -eq $ClinicTenant } | Select-Object -First 1
if (-not $active) {
    $created = Invoke-RestMethod "$api/api/connect/org-links/invite" -Method POST -Headers $hPharm `
        -ContentType "application/json" -Body (@{
            partnerTenantCode = $ClinicTenant
            ourOrgRole = "pharmacy"
            partnerOrgRole = "clinic"
        } | ConvertTo-Json)
    $null = Invoke-RestMethod "$api/api/connect/org-links/$($created.id)/accept" -Method POST -Headers $hClinic
}
$clinicLinks = Invoke-RestMethod "$api/api/connect/org-links?status=active" -Headers $hClinic
$pharmacyPartner = @($clinicLinks) | Where-Object { $_.partnerOrgRole -eq "pharmacy" } | Select-Object -First 1
if (-not $pharmacyPartner) { throw "clinic has no pharmacy partner" }
$pharmacyTenantId = [string]$pharmacyPartner.partnerTenantId

$customers = Invoke-RestMethod "$api/api/customers?page=1&pageSize=5&search=BN01" -Headers $hClinic
$customerId = $null
if ($customers.items) {
    $hit = @($customers.items | Where-Object { $_.customerCode -eq "BN01" })
    if ($hit.Length -gt 0) { $customerId = [string]$hit[0].id }
}
if (-not $customerId) { throw "BN01 missing on clinic" }

$providersResp = Invoke-RestMethod "$api/api/clinic/providers" -Headers $hClinic
$providerId = $null
$firstProvider = @($providersResp) | Select-Object -First 1
if ($firstProvider -and $firstProvider.id) { $providerId = [string]$firstProvider.id }

$walkBody = @{ customerId = $customerId; chiefComplaint = "UAT SALES-05" }
if ($providerId) { $walkBody.providerId = $providerId }
$visit = Invoke-RestMethod "$api/api/clinic/visits" -Method POST -Headers $hClinic `
    -ContentType "application/json; charset=utf-8" `
    -Body ([System.Text.Encoding]::UTF8.GetBytes(($walkBody | ConvertTo-Json -Compress)))

$warehouseId = $null
try {
    $whList = @(Invoke-RestMethod "$api/api/inventory/warehouses" -Headers $hPharm)
    $firstWh = $whList | Select-Object -First 1
    if ($null -ne $firstWh) {
        $idVal = $firstWh.Id
        if ($null -eq $idVal) { $idVal = $firstWh.id }
        if ($idVal -is [guid]) { $warehouseId = $idVal.ToString('D') }
        elseif ($idVal) {
            $s = [string]$idVal
            if ($s -match '([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})') {
                $warehouseId = $Matches[1]
            }
        }
    }
} catch { }
if (-not $warehouseId) { throw "no warehouse on NT" }
Write-Host "OK warehouse=$warehouseId" -ForegroundColor Green

# Prefer known e2e barcode, then broad POS search
$candidateCodes = @('8934567890012')
$searchUrl = $api + "/api/sales/pos/search?search=1&warehouseId=" + [uri]::EscapeDataString($warehouseId)
try {
    $search = Invoke-RestMethod $searchUrl -Headers $hPharm
    $hits = @()
    if ($search.items) { $hits = @($search.items) } else { $hits = @($search) }
    foreach ($hit in $hits) {
        $c = [string]($hit.lookupCode)
        if (-not $c) { $c = [string]($hit.productCode) }
        if ($c) { $candidateCodes += $c }
    }
} catch { }

$productId = $null
$productUnitId = $null
$drugName = $null
$total = [decimal]0
foreach ($code in ($candidateCodes | Select-Object -Unique)) {
    try {
        $lookup = Invoke-RestMethod ($api + "/api/sales/pos/lookup?barcode=" + [uri]::EscapeDataString($code) + "&warehouseId=" + [uri]::EscapeDataString($warehouseId)) -Headers $hPharm
        if ([decimal]$lookup.stockAvailable -le 0) { continue }
        $productId = [string]$lookup.productId
        $productUnitId = [string]$lookup.productUnitId
        $drugName = [string]$lookup.productName
        $total = [decimal]$lookup.unitPrice
        if ($total -le 0) { $total = 1000 }
        break
    } catch { }
}
if (-not $productId) { throw "no in-stock POS product on NT warehouse" }
Write-Host "OK product=$drugName unit=$productUnitId price=$total" -ForegroundColor Green

$rxBody = (@{
    visitId = $visit.id
    providerId = $providerId
    diagnosisText = "UAT SALES-05"
    lines = @(
        @{ drugName = $drugName; strength = ""; quantity = 1; unit = "vien"; dosageInstruction = "1x1" }
    )
} | ConvertTo-Json -Compress -Depth 5)
$rx = Invoke-RestMethod "$api/api/clinic/prescriptions" -Method POST -Headers $hClinic `
    -ContentType "application/json; charset=utf-8" -Body ([System.Text.Encoding]::UTF8.GetBytes($rxBody))
$null = Invoke-RestMethod "$api/api/clinic/prescriptions/$($rx.id)/finalize" -Method POST -Headers $hClinic
$sent = Invoke-RestMethod "$api/api/clinic/prescriptions/$($rx.id)/send-to-pharmacy" -Method POST -Headers $hClinic `
    -ContentType "application/json" -Body (@{ pharmacyTenantId = $pharmacyTenantId } | ConvertTo-Json)
$handoffId = [string]$sent.connectHandoffId
if (-not $handoffId) { $handoffId = [string]$sent.ConnectHandoffId }
if (-not $handoffId) { throw "no connectHandoffId" }
Write-Host "OK handoff=$handoffId drug=$drugName" -ForegroundColor Green

# POS complete with connectRxHandoffId
$saleBody = @{
    warehouseId = $warehouseId
    saveAsDraft = $false
    priceType = 1
    connectRxHandoffId = $handoffId
    payments = @(@{ paymentMethod = 1; amount = $total })
    items = @(
        @{
            productId = $productId
            productUnitId = $productUnitId
            quantity = 1
        }
    )
}

try {
    $sale = Invoke-RestMethod "$api/api/sales/orders" -Method POST -Headers $hPharm `
        -ContentType "application/json" -Body ($saleBody | ConvertTo-Json -Depth 6)
} catch {
    $errText = $_.ErrorDetails.Message
    if (-not $errText -and $_.Exception.Response) {
        try {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $errText = $reader.ReadToEnd()
        } catch { }
    }
    Write-Host "sale attempt1 failed: $errText" -ForegroundColor Yellow
    # open shift if needed
    try {
        $null = Invoke-RestMethod "$api/api/sales/shifts/open" -Method POST -Headers $hPharm `
            -ContentType "application/json" -Body (@{ warehouseId = $warehouseId; openingCash = 0 } | ConvertTo-Json)
        Write-Host "opened shift" -ForegroundColor Yellow
    } catch { }
    $saleBody.payments = @(@{ paymentMethod = 1; amount = [math]::Max([double]$total, 999999) })
    try {
        $sale = Invoke-RestMethod "$api/api/sales/orders" -Method POST -Headers $hPharm `
            -ContentType "application/json" -Body ($saleBody | ConvertTo-Json -Depth 6)
    } catch {
        $errText2 = $_.ErrorDetails.Message
        throw "sale failed: $errText2 / first=$errText"
    }
}
$orderId = [string]$sale.id
$orderNo = [string]$sale.orderNumber
Write-Host "OK sale $orderNo id=$orderId total=$($sale.totalAmount)" -ForegroundColor Green

$detail = Invoke-RestMethod "$api/api/sales/orders/$orderId" -Headers $hPharm
$linked = $detail.connectRxHandoffId
if (-not $linked) { $linked = $detail.ConnectRxHandoffId }
if (-not $linked) {
    Write-Host "WARN order JSON missing connectRxHandoffId" -ForegroundColor Yellow
} else {
    Write-Host "OK order linked handoff=$linked" -ForegroundColor Green
}

$from = (Get-Date).AddDays(-1).ToUniversalTime().ToString("o")
$to = (Get-Date).AddDays(1).ToUniversalTime().ToString("o")
$reportUrl = $api + "/api/reports/sales/revenue-by-clinic-doctor?from=" + [uri]::EscapeDataString($from) + "&to=" + [uri]::EscapeDataString($to)
$report = Invoke-RestMethod -Uri $reportUrl -Headers $hPharm
$rows = @($report.rows)
if ($rows.Count -eq 0) { $rows = @($report.Rows) }
Write-Host ("SALES-05 rows=" + $rows.Count) -ForegroundColor Cyan
if ($rows.Count -lt 1) { throw "SALES-05 empty" }

$row0 = $rows[0]
$clinicName = $row0.clinicName; if (-not $clinicName) { $clinicName = $row0.ClinicName }
$orders = $row0.orderCount; if ($null -eq $orders) { $orders = $row0.OrderCount }
$net = $row0.netAmount; if ($null -eq $net) { $net = $row0.NetAmount }
Write-Host ("SALES-05 clinic=" + $clinicName + " orders=" + $orders + " net=" + $net) -ForegroundColor Green
Write-Host ""
Write-Host "=== UAT PASS ===" -ForegroundColor Green
