#!/usr/bin/env bash
# Daily PostgreSQL backup for novixa_prod
# Cron example: 0 2 * * * /opt/kit-platform/backup-db.sh
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/backups/KitPlatform}"
DB_NAME="${DB_NAME:-novixa_prod}"
DB_USER="${DB_USER:-KitPlatform}"
RETAIN_DAYS="${RETAIN_DAYS:-14}"

mkdir -p "$BACKUP_DIR"
STAMP="$(date +%Y%m%d_%H%M%S)"
FILE="$BACKUP_DIR/${DB_NAME}_${STAMP}.sql.gz"

sudo -u postgres pg_dump -U "$DB_USER" -d "$DB_NAME" --no-owner --no-acl | gzip > "$FILE"
find "$BACKUP_DIR" -name "${DB_NAME}_*.sql.gz" -mtime +"$RETAIN_DAYS" -delete
echo "Backup: $FILE ($(du -h "$FILE" | cut -f1))"
