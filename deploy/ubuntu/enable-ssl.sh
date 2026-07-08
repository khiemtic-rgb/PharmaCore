#!/usr/bin/env bash
# Bat HTTPS (Let's Encrypt) cho Novixa — chay tren VPS da co Nginx + HTTP OK.
#
# Usage:
#   export CERTBOT_EMAIL=care@novixa.vn
#   sudo bash /opt/kit-platform/enable-ssl.sh
#   # hoac sau upload:
#   sudo bash /tmp/kit-platform-upload/deploy/ubuntu/enable-ssl.sh
set -euo pipefail

DOMAIN="${DOMAIN:-novixa.vn}"
EMAIL="${CERTBOT_EMAIL:-}"

API_HOST="api.${DOMAIN}"
ADMIN_HOST="admin.${DOMAIN}"
APP_HOST="app.${DOMAIN}"
POS_HOST="pos.${DOMAIN}"

log() { echo -e "\n\033[1;36m==>\033[0m $*"; }
die() { echo "ERROR: $*" >&2; exit 1; }

[[ $EUID -eq 0 ]] || die "Chay bang root: sudo bash $0"
[[ -n "$EMAIL" ]] || die "Dat email: export CERTBOT_EMAIL=care@novixa.vn"

log "Kiem tra DNS (phai tro ve IP VPS)..."
for h in "$API_HOST" "$ADMIN_HOST" "$APP_HOST" "$POS_HOST"; do
  ip="$(getent ahosts "$h" | awk '/STREAM/ {print $1; exit}')"
  echo "  $h -> ${ip:-KHONG TIM THAY}"
done

log "Kiem tra Nginx..."
systemctl is-active --quiet nginx || die "nginx chua chay: systemctl start nginx"
nginx -t

if ! command -v certbot >/dev/null 2>&1; then
  log "Cai certbot..."
  export DEBIAN_FRONTEND=noninteractive
  apt-get update -qq
  apt-get install -y -qq certbot python3-certbot-nginx
fi

log "Mo port 443 (UFW)..."
ufw allow 'Nginx Full' >/dev/null 2>&1 || true

log "Cap chung chi SSL..."
certbot --nginx \
  -d "$API_HOST" -d "$ADMIN_HOST" -d "$APP_HOST" -d "$POS_HOST" \
  --non-interactive --agree-tos -m "$EMAIL" --redirect

log "Kiem tra HTTPS..."
for h in "$ADMIN_HOST" "$APP_HOST" "$POS_HOST" "$API_HOST"; do
  code="$(curl -s -o /dev/null -w '%{http_code}' "https://${h}/" || true)"
  echo "  https://${h}/ -> HTTP ${code:-FAIL}"
done

log "Xong. Certbot tu gia han qua systemd timer."
