#!/usr/bin/env bash
set -euo pipefail
source /etc/kit-platform/secrets.generated
CS=$(grep '^ConnectionStrings__Default=' /etc/kit-platform/api.env | cut -d= -f2-)
DB_USER=$(echo "$CS" | sed -n 's/.*Username=\([^;]*\).*/\1/p')
DB_NAME=$(echo "$CS" | sed -n 's/.*Database=\([^;]*\).*/\1/p')
CS_PASS=$(echo "$CS" | sed -n 's/.*Password=\([^;]*\).*/\1/p')
if [[ -n "$CS_PASS" ]]; then
  DB_PASS="$CS_PASS"
fi
CONN="postgresql://${DB_USER}:${DB_PASS}@127.0.0.1:5432/${DB_NAME}"
echo "DB=$DB_NAME USER=$DB_USER"
bash /opt/kit-platform/run-kit-migrations-prod.sh "$CONN"
systemctl restart kit-platform-api
sleep 3
systemctl is-active kit-platform-api
