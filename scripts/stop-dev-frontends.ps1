# Dung Vite dev tren port 5173 (admin), 5174 (customer), 5175 (staff POS).
$ErrorActionPreference = "SilentlyContinue"

foreach ($port in 5173, 5174, 5175) {
    Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue |
        ForEach-Object {
            $proc = Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue
            if ($proc -and ($proc.ProcessName -eq "node" -or $proc.ProcessName -eq "cmd")) {
                Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
            }
        }
}

Write-Host "[OK] Da giai phong port 5173/5174/5175 (neu co Vite cu)." -ForegroundColor Green

