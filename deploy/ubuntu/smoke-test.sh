#!/usr/bin/env bash
# Quick smoke test after deploy
set -euo pipefail

API="${API_BASE:-https://api.novixa.vn}"
ADMIN="${ADMIN_BASE:-https://admin.novixa.vn}"
APP="${APP_BASE:-https://app.novixa.vn}"
POS="${POS_BASE:-https://pos.novixa.vn}"

echo "=== KitPlatform smoke test ==="

echo -n "API setup-status ... "
curl -sf "$API/api/platform/setup-status" | grep -q '"tenantsCount"' && echo OK || { echo FAIL; exit 1; }

echo -n "Admin index.html ... "
curl -sf "$ADMIN/" | grep -q '<html' && echo OK || { echo FAIL; exit 1; }

echo -n "Customer app index.html ... "
curl -sf "$APP/" | grep -q '<html' && echo OK || { echo FAIL; exit 1; }

echo -n "Staff POS index.html ... "
curl -sf "$POS/" | grep -q '<html' && echo OK || { echo FAIL; exit 1; }

echo -n "Staff POS manifest ... "
curl -sf "$POS/manifest.webmanifest" | grep -q 'Novixa' && echo OK || { echo FAIL; exit 1; }

echo -n "API health (DB) ... "
if curl -sf "$API/api/health/db" | grep -q '"database":true'; then
  echo OK
else
  echo FAIL
  exit 1
fi

echo "=== All checks passed ==="
