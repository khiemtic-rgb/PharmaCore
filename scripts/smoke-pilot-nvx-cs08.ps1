# NVX-CS-08 — Pilot smoke (automated pre-flight + API subset)
# Manual: POS FEFO, discount, PO/GRN — xem docs/novixa/07-customer/pilot-smoke-test-checklist-v1.md
param(
    [string]$BaseUrl = 'http://localhost:5290',
    [string]$TenantCode = 'DEMO_PHARMACY',
    [string]$CustomerPhone = '0909123456',
    [string]$OtpCode = '000000',
    [switch]$SkipBuild
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path $PSScriptRoot -Parent
$passed = 0
$failed = @()
$manual = @()

function Write-Phase([string]$Title) {
    Write-Host "`n=== $Title ===" -ForegroundColor Cyan
}

function Test-Step([string]$Id, [string]$Name, [scriptblock]$Block) {
    try {
        & $Block
        Write-Host "[OK] $Id $Name" -ForegroundColor Green
        $script:passed++
    }
    catch {
        Write-Host "[FAIL] $Id $Name" -ForegroundColor Red
        Write-Host "       $($_.Exception.Message)" -ForegroundColor DarkRed
        $script:failed += "$Id $Name"
    }
}

function Invoke-Api {
    param(
        [string]$Method = 'GET',
        [string]$Path,
        [hashtable]$Headers = @{},
        [object]$Body = $null,
        [switch]$AllowError
    )
    $uri = "$BaseUrl$Path"
    $params = @{
        Method      = $Method
        Uri         = $uri
        Headers     = $Headers
        TimeoutSec  = 30
    }
    if ($Body -ne $null) {
        $params.ContentType = 'application/json'
        $params.Body = ($Body | ConvertTo-Json -Compress)
    }
    try {
        return Invoke-RestMethod @params
    }
    catch {
        if ($AllowError -and $_.Exception.Response) {
            $code = [int]$_.Exception.Response.StatusCode
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $text = $reader.ReadToEnd()
            return [pscustomobject]@{ StatusCode = $code; Body = $text }
        }
        throw
    }
}

Write-Phase 'Phase 0 - Build and unit tests (NVX-CS-08 pre-flight)'
if (-not $SkipBuild) {
    Push-Location $repoRoot
    try {
        Test-Step 'P0' 'dotnet build API' {
            dotnet build src/KitPlatform.Api/KitPlatform.Api.csproj --verbosity quiet | Out-Null
            if ($LASTEXITCODE -ne 0) { throw "build exit $LASTEXITCODE" }
        }
        Test-Step 'P0' 'dotnet test Platform.Tests' {
            dotnet test tests/KitPlatform.Platform.Tests/KitPlatform.Platform.Tests.csproj --verbosity quiet | Out-Null
            if ($LASTEXITCODE -ne 0) { throw "test exit $LASTEXITCODE" }
        }
    }
    finally {
        Pop-Location
    }
}
else {
    Write-Host '[SKIP] Phase 0 (SkipBuild)' -ForegroundColor Yellow
}

Write-Phase 'Phase 1 - API health'
Test-Step 'P1' 'GET /api/health' {
    $h = Invoke-Api -Path '/api/health'
    if ($h.status -ne 'ok') { throw "status=$($h.status)" }
}

Test-Step 'P1' 'GET /api/health/db' {
    $h = Invoke-Api -Path '/api/health/db'
    if ($h.status -ne 'ok') { throw "status=$($h.status)" }
}

Write-Phase 'Phase 2 - KIT Platform / Pack (module gate)'
Test-Step 'F1' 'GET tenant-platform settings' {
    $script:admin = Invoke-Api -Method POST -Path '/api/auth/login' -Body @{
        username = 'admin'
        password = 'Admin@123'
    }
    if (-not $script:admin.accessToken) { throw 'no admin token' }
    $script:adminH = @{ Authorization = "Bearer $($script:admin.accessToken)" }
    $p = Invoke-Api -Path '/api/system/tenant-platform' -Headers $script:adminH
    if (-not $p.vertical) { throw 'no vertical' }
    if ($p.enabledModules.Count -lt 1) { throw 'no enabled modules' }
    $script:platform = $p
}

Test-Step 'F2' 'GET platform module registry' {
    $mods = Invoke-Api -Path '/api/system/tenant-platform/modules' -Headers $script:adminH
    if ($mods.Count -lt 5) { throw "expected modules, got $($mods.Count)" }
}

Test-Step 'F3' 'customer_app module enabled' {
    $enabled = @($script:platform.enabledModules)
    if ($enabled -notcontains 'customer_app') { throw 'customer_app not enabled' }
}

Write-Phase 'Phase 3 - Customer App (B1-B4 subset)'
Test-Step 'B1' 'OTP login' {
    Invoke-Api -Method POST -Path '/api/customer-app/auth/request-otp' -Body @{
        phone      = $CustomerPhone
        tenantCode = $TenantCode
    } | Out-Null
    $script:cust = Invoke-Api -Method POST -Path '/api/customer-app/auth/verify-otp' -Body @{
        phone      = $CustomerPhone
        code       = $OtpCode
        tenantCode = $TenantCode
    }
    if (-not $script:cust.accessToken) { throw 'no customer token' }
    $script:custH = @{ Authorization = "Bearer $($script:cust.accessToken)" }
}

Test-Step 'B1' 'Customer profile /me' {
    $me = Invoke-Api -Path '/api/customer-app/auth/me' -Headers $script:custH
    if (-not $me.fullName) { throw 'no profile' }
}

Test-Step 'B2' 'Active medications / reminders' {
    $med = Invoke-Api -Path '/api/customer-app/active-medications' -Headers $script:custH
    if ($null -eq $med.items) { throw 'no medications items' }
    $rem = Invoke-Api -Path '/api/customer-app/reminders' -Headers $script:custH
    if ($null -eq $rem.items) { throw 'no reminders items' }
}

Test-Step 'B3' 'AI Copilot valid question' {
    $ai = Invoke-Api -Method POST -Path '/api/customer-app/ai-health/ask' -Headers $script:custH -Body @{
        question = 'Can I take paracetamol before meals?'
    }
    if (-not $ai.answer) { throw 'no AI answer' }
    if (-not $ai.disclaimer) { throw 'no disclaimer' }
}

Test-Step 'B4' 'AI reject short question (BR-AI-001)' {
    $bad = Invoke-Api -Method POST -Path '/api/customer-app/ai-health/ask' -Headers $script:custH -Body @{
        question = 'ab'
    } -AllowError
    if ($bad.StatusCode -ne 400) { throw "expected 400, got $($bad.StatusCode)" }
}

Test-Step 'B6' 'Family members list' {
    $f = Invoke-Api -Path '/api/customer-app/family' -Headers $script:custH
    if ($null -eq $f.items) { throw 'no family items' }
}

Write-Phase 'Phase 3b - Health wallet API (H1-H6)'
Test-Step 'H1' 'List health records' {
    $hr = Invoke-Api -Path '/api/customer-app/health-records' -Headers $script:custH
    if ($null -eq $hr.items) { throw 'no health items' }
}

Test-Step 'H2' 'Create + update health record' {
    $recordedAt = (Get-Date).ToUniversalTime().ToString('o')
    $created = Invoke-Api -Method POST -Path '/api/customer-app/health-records' -Headers $script:custH -Body @{
        recordType = 'note'
        title      = 'NVX smoke health note'
        summary    = 'automated smoke'
        recordedAt = $recordedAt
    }
    if (-not $created.id) { throw 'no id' }
    $script:smokeHealthRecordId = $created.id
    $updated = Invoke-Api -Method PUT -Path "/api/customer-app/health-records/$($created.id)" -Headers $script:custH -Body @{
        recordType = 'note'
        title      = 'NVX smoke health note updated'
        summary    = 'automated smoke updated'
        recordedAt = $recordedAt
    }
    if ($updated.title -ne 'NVX smoke health note updated') { throw 'update failed' }
}

Test-Step 'H3' 'Create care reminder (lab)' {
    $care = Invoke-Api -Method POST -Path '/api/customer-app/care-reminders' -Headers $script:custH -Body @{
        reminderType = 'lab'
        title        = 'NVX smoke lab follow-up'
        note         = 'smoke test'
        remindAt     = (Get-Date).AddDays(14).ToUniversalTime().ToString('o')
    }
    if ($care.reminderType -ne 'lab') { throw 'wrong reminder type' }
    $script:smokeCareReminderId = $care.id
}

Test-Step 'H4' 'List care reminders' {
    $list = Invoke-Api -Path '/api/customer-app/care-reminders' -Headers $script:custH
    if ($list.items.Count -lt 1) { throw 'no care reminders' }
}

Test-Step 'H5' 'Active medications forSelf filter' {
    $med = Invoke-Api -Path '/api/customer-app/active-medications?forSelf=true' -Headers $script:custH
    if ($null -eq $med.items) { throw 'no medications items' }
}

Test-Step 'H6' 'Cleanup smoke health + care data' {
    if ($script:smokeCareReminderId) {
        Invoke-Api -Method DELETE -Path "/api/customer-app/care-reminders/$($script:smokeCareReminderId)" -Headers $script:custH | Out-Null
    }
    if ($script:smokeHealthRecordId) {
        Invoke-Api -Method DELETE -Path "/api/customer-app/health-records/$($script:smokeHealthRecordId)" -Headers $script:custH | Out-Null
    }
}

Test-Step 'B5' 'Chat consent + send message' {
    Invoke-Api -Method PUT -Path '/api/customer-app/consents' -Headers $script:custH -Body @{
        items = @(@{ channel = 5; purpose = 4; granted = $true })
    } | Out-Null
    $msg = Invoke-Api -Method POST -Path '/api/customer-app/chat/messages' -Headers $script:custH -Body @{
        body = 'NVX smoke: pharmacist chat test'
    }
    if (-not $msg.id) { throw 'no message id' }
    $msgs = Invoke-Api -Path '/api/customer-app/chat/messages' -Headers $script:custH
    if ($msgs.items.Count -lt 1) { throw 'no chat messages' }
}

Write-Phase 'Phase 4 - Admin regression (C subset + audit)'
Test-Step 'C1' 'Customer engagement overview' {
    Invoke-Api -Path '/api/customer-engagement/overview?periodDays=30' -Headers $script:adminH | Out-Null
}

Test-Step 'A*' 'Audit log has entries' {
    $audit = Invoke-Api -Path '/api/system/audit-log?page=1&pageSize=5' -Headers $script:adminH
    if ($audit.total -lt 1) { throw 'no audit entries' }
}

Test-Step 'D' 'Admin reservations + draft orders list' {
    $r = Invoke-Api -Path '/api/sales/customer-reservations' -Headers $script:adminH
    if ($null -eq $r.items) { throw 'no reservations' }
    $d = Invoke-Api -Path '/api/sales/customer-draft-orders' -Headers $script:adminH
    if ($null -eq $d.items) { throw 'no draft orders' }
}

Write-Phase 'Phase 5 - Module gate toggle (F5) + platform_events'
Test-Step 'F5' 'Disable medication -> active-medications 403' {
    $enabled = @($script:platform.enabledModules)
    $script:originalModules = $enabled
    $withoutMed = @($enabled | Where-Object { $_ -ne 'medication' })
    if ($withoutMed.Count -ge $enabled.Count) { throw 'medication module missing in baseline' }
    Invoke-Api -Method PUT -Path '/api/system/tenant-platform' -Headers $script:adminH -Body @{
        vertical       = $script:platform.vertical
        enabledModules = $withoutMed
    } | Out-Null
    $blocked = Invoke-Api -Path '/api/customer-app/active-medications' -Headers $script:custH -AllowError
    if ($blocked.StatusCode -ne 403) { throw "expected 403, got $($blocked.StatusCode)" }
}

Test-Step 'F5' 'Restore medication -> active-medications OK' {
    Invoke-Api -Method PUT -Path '/api/system/tenant-platform' -Headers $script:adminH -Body @{
        vertical       = $script:platform.vertical
        enabledModules = @($script:originalModules)
    } | Out-Null
    $med = Invoke-Api -Path '/api/customer-app/active-medications' -Headers $script:custH
    if ($null -eq $med.items) { throw 'no medications after restore' }
}

Test-Step 'G1' 'platform_events table exists' {
    $psqlCandidates = @(
        'C:\Program Files\PostgreSQL\18\bin\psql.exe',
        'C:\Program Files\PostgreSQL\17\bin\psql.exe',
        'C:\Program Files\PostgreSQL\16\bin\psql.exe'
    )
    $psql = $psqlCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
    if (-not $psql) {
        $cmd = Get-Command psql -ErrorAction SilentlyContinue
        if ($cmd) { $psql = $cmd.Source }
    }
    if (-not $psql) {
        Write-Host '       [SKIP] psql not found' -ForegroundColor Yellow
        return
    }
    $conn = 'postgresql://kitplatform:kitplatform_dev_2026@localhost:5432/kitplatform'
    $exists = & $psql $conn -tAc "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'platform_events');"
    if ($exists.Trim() -ne 't') { throw 'platform_events table missing' }
}

$manual = @(
    'A1 - Open shift, sell OTC FEFO (POS manual)',
    'A2 - Sell when batch 1 insufficient stock',
    'A3 - Discount over limit rejected for normal user',
    'A4 - Admin discount within limit',
    'A5 - PO to GRN complete',
    'A6 - Stock count / adjustment approval',
    'B5 - Pharmacist chat API (automated); UI staff reply (manual)',
    'C2 - INV-02 near-expiry report',
    'C3 - Revenue dashboard matches A1 order',
    'D - Returns + Staff POS mobile (manual)'
)

Write-Host "`n--- Automated summary ---" -ForegroundColor Cyan
Write-Host "Passed: $passed"
if ($failed.Count -gt 0) {
    Write-Host "Failed ($($failed.Count)):" -ForegroundColor Red
    $failed | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
}
else {
    Write-Host 'Automated NVX-CS-08 subset: PASS' -ForegroundColor Green
}

Write-Host "`n--- Manual checklist (per tenant NT1/NT2/NT3) ---" -ForegroundColor Yellow
$manual | ForEach-Object { Write-Host "  [ ] $_" }

Write-Host "`nDoc: docs/novixa/07-customer/pilot-smoke-test-checklist-v1.md" -ForegroundColor DarkGray

if ($failed.Count -gt 0) { exit 1 }
exit 0

