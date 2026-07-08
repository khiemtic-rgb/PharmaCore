#!/usr/bin/env bash
# Ops checklist on VPS after deploy — run as root
# Usage: bash /opt/kit-platform/ops-checklist.sh
set -euo pipefail

API="${API_BASE:-https://api.novixa.vn}"
RED='\033[0;31m'; GRN='\033[0;32m'; YLW='\033[1;33m'; NC='\033[0m'
ok=0; fail=0

check() {
  local name="$1"
  shift
  if "$@" >/dev/null 2>&1; then
    echo -e "${GRN}[OK]${NC} $name"
    ok=$((ok + 1))
  else
    echo -e "${RED}[FAIL]${NC} $name"
    fail=$((fail + 1))
  fi
}

echo "=== KitPlatform VPS ops checklist ==="

check "kit-platform-api active" systemctl is-active --quiet kit-platform-api
check "kit-platform-sms-stub active" systemctl is-active --quiet kit-platform-sms-stub
check "nginx active" systemctl is-active --quiet nginx
check "postgresql active" systemctl is-active --quiet postgresql

check "api.env exists" test -f /etc/kit-platform/api.env
check "api.dll exists" test -f /var/www/kit-platform/api/KitPlatform.Api.dll
check "admin index" test -f /var/www/kit-platform/admin/index.html
check "staff-app index" test -f /var/www/kit-platform/staff-app/index.html

echo -n "API health ... "
if curl -sf "$API/api/health" | grep -q '"status":"ok"'; then
  echo -e "${GRN}OK${NC}"; ok=$((ok + 1))
else
  echo -e "${RED}FAIL${NC}"; fail=$((fail + 1))
fi

echo -n "API health/db ... "
if curl -sf "$API/api/health/db" | grep -q '"database":true'; then
  echo -e "${GRN}OK${NC}"; ok=$((ok + 1))
else
  echo -e "${RED}FAIL${NC}"; fail=$((fail + 1))
fi

echo -n "SMS Provider config ... "
if grep -q '^CustomerAppSms__Provider=Http' /etc/kit-platform/api.env \
  && grep -q '^CustomerAppSms__HttpUrl=' /etc/kit-platform/api.env; then
  echo -e "${GRN}OK${NC}"; ok=$((ok + 1))
else
  echo -e "${YLW}WARN${NC} (can cause API crash if Provider=Log only)"
fi

echo -n "pilot_code column ... "
if sudo -u postgres psql -d novixa_prod -tAc \
  "SELECT 1 FROM information_schema.columns WHERE table_name='customer_otp_challenges' AND column_name='pilot_code'" \
  | grep -q 1; then
  echo -e "${GRN}OK${NC}"; ok=$((ok + 1))
else
  echo -e "${RED}FAIL${NC}"; fail=$((fail + 1))
fi

echo -n "Backup dir ... "
if test -d /var/backups/KitPlatform; then
  echo -e "${GRN}OK${NC}"; ok=$((ok + 1))
else
  echo -e "${YLW}WARN${NC} (mkdir /var/backups/KitPlatform + cron backup-db.sh)"
fi

echo ""
echo "=== $ok passed, $fail failed ==="
test "$fail" -eq 0
