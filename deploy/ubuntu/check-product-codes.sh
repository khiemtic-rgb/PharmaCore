#!/usr/bin/env bash
set -euo pipefail
source /etc/kit-platform/secrets.generated
CS=$(grep '^ConnectionStrings__Default=' /etc/kit-platform/api.env | cut -d= -f2-)
DB_USER=$(echo "$CS" | sed -n 's/.*Username=\([^;]*\).*/\1/p')
DB_NAME=$(echo "$CS" | sed -n 's/.*Database=\([^;]*\).*/\1/p')
CS_PASS=$(echo "$CS" | sed -n 's/.*Password=\([^;]*\).*/\1/p')
export PGPASSWORD="${CS_PASS:-$DB_PASS}"
echo "DB=$DB_NAME USER=$DB_USER"
psql -h 127.0.0.1 -U "$DB_USER" -d "$DB_NAME" -c "SELECT product_code, (deleted_at IS NOT NULL) AS deleted FROM products WHERE product_code ~* '^SP-[0-9]+\$' ORDER BY CAST(SUBSTRING(product_code FROM 4) AS BIGINT) DESC LIMIT 15;"
psql -h 127.0.0.1 -U "$DB_USER" -d "$DB_NAME" -c "SELECT COALESCE(MAX(CAST(SUBSTRING(product_code FROM 4) AS BIGINT)), 0) AS max_active FROM products WHERE deleted_at IS NULL AND product_code ~* '^SP-[0-9]+\$';"
psql -h 127.0.0.1 -U "$DB_USER" -d "$DB_NAME" -c "SELECT COALESCE(MAX(CAST(SUBSTRING(product_code FROM 4) AS BIGINT)), 0) AS max_all FROM products WHERE product_code ~* '^SP-[0-9]+\$';"
psql -h 127.0.0.1 -U "$DB_USER" -d "$DB_NAME" -c "SELECT indexname, indexdef FROM pg_indexes WHERE tablename='products' AND indexdef ILIKE '%product_code%';"
psql -h 127.0.0.1 -U "$DB_USER" -d "$DB_NAME" -tAc "SELECT count(*) FROM products WHERE deleted_at IS NULL;"
