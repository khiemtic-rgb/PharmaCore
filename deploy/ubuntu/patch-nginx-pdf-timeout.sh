#!/bin/bash
# Insert long-timeout proxy block for KAP PDF downloads (idempotent).
set -euo pipefail

CONF="/etc/nginx/sites-available/kit-platform"
MARKER="report\\.pdf"

if grep -q "$MARKER" "$CONF" 2>/dev/null; then
  echo "nginx PDF timeout block already present"
  exit 0
fi

python3 <<'PY'
from pathlib import Path

conf = Path("/etc/nginx/sites-available/kit-platform")
text = conf.read_text()
block = """    location ~ ^/api/public/assessment/submissions/[0-9a-f-]+/report\\.pdf$ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Host api.novixa.vn;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
    }

"""

needle = "    location /api/ {"
if needle in text and "survey.novixa.vn" in text:
    text = text.replace(needle, block + needle, 1)
elif "    location / {\n        proxy_pass http://127.0.0.1:5000;" in text:
    text = text.replace(
        "    location / {\n        proxy_pass http://127.0.0.1:5000;",
        block + "    location / {\n        proxy_pass http://127.0.0.1:5000;",
        1,
    )
else:
    raise SystemExit("Could not find nginx insertion point for PDF timeout block")

conf.write_text(text)
print("Inserted nginx PDF timeout block")
PY

nginx -t
systemctl reload nginx
echo "nginx reloaded"
