# Rx-2 catalog check: seed RXDEMO SKUs must appear when BS picks NT and searches.
# Prerequisites:
#   1) Apply seed: psql $CONN -f migrations/seed/005_rx_portal_catalog_demo.sql
#   2) API running; active prescriber link for smoke phone
param(
    [string]$BaseUrl = 'http://localhost:5290',
    [string]$TenantCode = 'NT_XUANHOA',
    [string]$AdminUser = 'admin',
    [string]$AdminPassword = 'Admin@123',
    [switch]$ApplySeed
)

$ErrorActionPreference = 'Stop'
$api = "$($BaseUrl.TrimEnd('/'))/api"
$passed = 0; $failed = @()

function Test-Step([string]$Name, [scriptblock]$Block) {
    try { & $Block; Write-Host "[OK] $Name" -ForegroundColor Green; $script:passed++ }
    catch { Write-Host "[FAIL] $Name - $($_.Exception.Message)" -ForegroundColor Red; $script:failed += $Name }
}

Write-Host "`n=== Rx-2 catalog smoke ($BaseUrl / $TenantCode) ===" -ForegroundColor Cyan
Write-Host @"
Cheat sheet (sau seed 005):
  Customer : RXDEMO-KH / 0908888001
  OTC      : RXDEMO-PARA  (Paracetamol)
  Rx       : RXDEMO-AMOX  (Amoxicillin), RXDEMO-AMLO (Amlodipine)
  Controlled (D16, hidden in portal search): RXDEMO-CTRL
  Goi y tren portal: Amox | Para | RXDEMO
"@ -ForegroundColor DarkCyan

if ($ApplySeed) {
    $psql = @(
        'C:\Program Files\PostgreSQL\18\bin\psql.exe',
        'C:\Program Files\PostgreSQL\17\bin\psql.exe',
        'C:\Program Files\PostgreSQL\16\bin\psql.exe'
    ) | Where-Object { Test-Path $_ } | Select-Object -First 1
    if (-not $psql) { throw 'psql not found' }
    $seed = Join-Path $PSScriptRoot '..\migrations\seed\005_rx_portal_catalog_demo.sql'
    $env:PGPASSWORD = 'kitplatform_dev_2026'
    & $psql -h localhost -U kitplatform -d kitplatform -v ON_ERROR_STOP=1 -f $seed
    if ($LASTEXITCODE -ne 0) { throw 'seed failed' }
    Write-Host '[OK] Applied seed 005_rx_portal_catalog_demo.sql' -ForegroundColor Green
}

$admin = Invoke-RestMethod "$api/auth/login" -Method POST -ContentType 'application/json' `
    -Body (@{ username = $AdminUser; password = $AdminPassword; tenantCode = $TenantCode } | ConvertTo-Json)
$adminH = @{ Authorization = "Bearer $($admin.accessToken)" }

# Resolve tenant + ensure smoke BS can login (reuse portal OTP flow lightly)
. (Join-Path $PSScriptRoot 'api-dev.ps1') | Out-Null
$psql = @(
    'C:\Program Files\PostgreSQL\18\bin\psql.exe',
    'C:\Program Files\PostgreSQL\17\bin\psql.exe',
    'C:\Program Files\PostgreSQL\16\bin\psql.exe'
) | Where-Object { Test-Path $_ } | Select-Object -First 1
$env:PGPASSWORD = 'kitplatform_dev_2026'

$ctx = & $psql -h localhost -U kitplatform -d kitplatform -t -A -F '|' -c @"
SELECT t.id::text, COALESCE(p.phone,''), COALESCE(l.link_status,'')
FROM tenants t
LEFT JOIN pack_pharmacy.prescriber_tenant_links l
  ON l.tenant_id = t.id AND l.link_status = 'active'
LEFT JOIN pack_pharmacy.prescribers p ON p.id = l.prescriber_id AND p.deleted_at IS NULL
WHERE t.tenant_code = '$TenantCode'
ORDER BY p.phone NULLS LAST
LIMIT 1
"@
$parts = ($ctx | Select-Object -First 1).ToString().Trim().Split('|')
$tenantId = $parts[0]
$bsPhone = if ($parts.Length -gt 1 -and $parts[1]) { $parts[1] } else { '0909999001' }

Test-Step 'Seed SKUs exist in DB' {
    $codes = & $psql -h localhost -U kitplatform -d kitplatform -t -A -c @"
SELECT string_agg(product_code, ',' ORDER BY product_code)
FROM products
WHERE tenant_id = '$tenantId'::uuid
  AND product_code LIKE 'RXDEMO-%'
  AND deleted_at IS NULL
"@
    $codes = ($codes | Select-Object -First 1).ToString().Trim()
    foreach ($need in @('RXDEMO-PARA','RXDEMO-AMOX','RXDEMO-AMLO','RXDEMO-CTRL')) {
        if ($codes -notlike "*$need*") { throw "missing $need in [$codes] - run with -ApplySeed" }
    }
}

$otp = Invoke-RestMethod "$api/prescriber-portal/auth/otp-request" -Method POST -ContentType 'application/json' `
    -Body (@{ phone = $bsPhone } | ConvertTo-Json)
$code = if ($otp.pilotCode) { $otp.pilotCode } else { '000000' }
$login = Invoke-RestMethod "$api/prescriber-portal/auth/otp-verify" -Method POST -ContentType 'application/json' `
    -Body (@{ phone = $bsPhone; code = $code } | ConvertTo-Json)
$bsH = @{ Authorization = "Bearer $($login.accessToken)" }

Test-Step 'Browse catalog after picking NT (empty q)' {
    $list = Invoke-RestMethod "$api/prescriber-portal/products?tenantId=$tenantId" -Headers $bsH
    if (@($list).Count -lt 1) { throw 'empty catalog' }
    $codes = @($list | ForEach-Object { $_.productCode })
    if ($codes -contains 'RXDEMO-CTRL') { throw 'controlled must be hidden from portal search' }
}

Test-Step 'Type Amox -> RXDEMO-AMOX' {
    $list = Invoke-RestMethod "$api/prescriber-portal/products?tenantId=$tenantId&q=Amox" -Headers $bsH
    $hit = @($list) | Where-Object { $_.productCode -eq 'RXDEMO-AMOX' } | Select-Object -First 1
    if (-not $hit) { throw 'RXDEMO-AMOX not found for q=Amox' }
    if ($hit.dispensingClass -ne 'prescription') { throw "class=$($hit.dispensingClass)" }
    if (-not $hit.defaultUnitId) { throw 'missing defaultUnitId' }
}

Test-Step 'Type Para -> RXDEMO-PARA (OTC)' {
    $list = Invoke-RestMethod "$api/prescriber-portal/products?tenantId=$tenantId&q=Para" -Headers $bsH
    $hit = @($list) | Where-Object { $_.productCode -eq 'RXDEMO-PARA' } | Select-Object -First 1
    if (-not $hit) { throw 'RXDEMO-PARA not found for q=Para' }
    if ($hit.dispensingClass -ne 'otc') { throw "class=$($hit.dispensingClass)" }
}

Test-Step 'Type RXDEMO -> Rx+OTC, no controlled' {
    $list = Invoke-RestMethod "$api/prescriber-portal/products?tenantId=$tenantId&q=RXDEMO" -Headers $bsH
    $codes = @($list | ForEach-Object { $_.productCode })
    foreach ($need in @('RXDEMO-PARA','RXDEMO-AMOX','RXDEMO-AMLO')) {
        if ($codes -notcontains $need) { throw "missing $need" }
    }
    if ($codes -contains 'RXDEMO-CTRL') { throw 'controlled leaked into search' }
}

Test-Step 'Customer RXDEMO-KH searchable' {
    $list = Invoke-RestMethod "$api/prescriber-portal/customers?tenantId=$tenantId&q=RXDEMO" -Headers $bsH
    $hit = @($list) | Where-Object { $_.customerCode -eq 'RXDEMO-KH' -or $_.phone -eq '0908888001' } | Select-Object -First 1
    if (-not $hit) { throw 'RXDEMO-KH not found' }
}

Test-Step 'Create mixed Rx+OTC signed toa' {
    $cust = Invoke-RestMethod "$api/prescriber-portal/customers?tenantId=$tenantId&q=0908888001" -Headers $bsH
    $customerId = (@($cust) | Select-Object -First 1).id
    $prods = Invoke-RestMethod "$api/prescriber-portal/products?tenantId=$tenantId&q=RXDEMO" -Headers $bsH
    $amox = @($prods) | Where-Object productCode -eq 'RXDEMO-AMOX' | Select-Object -First 1
    $para = @($prods) | Where-Object productCode -eq 'RXDEMO-PARA' | Select-Object -First 1
    $body = @{
        tenantId = $tenantId
        customerId = $customerId
        notes = 'smoke catalog mixed toa'
        lines = @(
            @{ productId = $amox.productId; productUnitId = $amox.defaultUnitId; qtyPrescribed = 10; dosageInstruction = '1x2' },
            @{ productId = $para.productId; productUnitId = $para.defaultUnitId; qtyPrescribed = 10; dosageInstruction = '1x3' }
        )
    } | ConvertTo-Json -Depth 6
    $rx = Invoke-RestMethod "$api/prescriber-portal/prescriptions" -Method POST -ContentType 'application/json' -Headers $bsH -Body $body
    if ($rx.status -ne 'signed') { throw "status=$($rx.status)" }
    if ($rx.lines.Count -lt 2) { throw 'expected 2 lines' }
    Write-Host "       rx=$($rx.prescriptionCode)" -ForegroundColor DarkGray
}

Write-Host "`n=== Catalog smoke: $passed passed, $($failed.Count) failed ===" -ForegroundColor $(if ($failed.Count -eq 0) { 'Green' } else { 'Red' })
if ($failed.Count -gt 0) { exit 1 }
