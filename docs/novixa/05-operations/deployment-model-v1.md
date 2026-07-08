# Novixa — Mô hình triển khai V1

**Mã:** NVX-OPS-01 · **Tier:** T2/T3 · **Trạng thái:** Draft · **Version:** 1.0

---

## 1. Tổng quan

Novixa V1 triển khai theo **Model B — SaaS multi-tenant**:

- **1 PostgreSQL** (`novixa_prod`)
- **1 API** (`api.novixa.vn`)
- **N tenant** (mỗi nhà thuốc / chuỗi)
- Static frontends trên cùng VPS (hoặc CDN sau này)

Marketing **novixa.vn** deploy riêng trên **Cloudflare Pages** — không DB ERP.

---

## 2. URL Production chuẩn

| Thành phần | URL | Ghi chú |
|------------|-----|---------|
| API | `https://api.novixa.vn` | Kestrel behind nginx |
| Admin ERP | `https://admin.novixa.vn` | SPA static |
| Customer App | `https://app.novixa.vn` | PWA static |
| POS (desktop) | `https://pos.novixa.vn` | Admin POS route / alias |
| Marketing | `https://novixa.vn` | Cloudflare Pages |

---

## 3. Mô hình triển khai

### Model B — Khuyến nghị (≥2 tenant)

```
┌─────────────────────────────────────┐
│ novixa_prod                          │
│  tenants: NT_A, NT_B, …             │
│  tenant_id trên mọi bảng nghiệp vụ  │
└─────────────────────────────────────┘
         ↑ JWT tenant context
    KitPlatform.Api (1 instance)
```

**Thêm tenant:** `https://admin.novixa.vn/setup` + `Platform__ProvisioningKey`

### Model A — Pilot tách DB (ngoại lệ)

2 DB, 2 bộ URL — chỉ khi cách ly tuyệt đối. Xem `pilot-go-live-checklist.md` §0A.

---

## 4. Pipeline deploy ERP

### 4.1 Build (máy dev / CI)

```powershell
cd E:\KitPlatform
.\scripts\deploy-production.ps1 -ApiBaseUrl "https://api.novixa.vn"
```

Output: `publish/` (api + admin + customer-app + staff-app)

### 4.2 Upload VPS

```powershell
.\scripts\upload-to-vps.ps1 -SshTarget root@<VPS_IP>
```

### 4.3 Bootstrap lần đầu (VPS Ubuntu 24.04)

```bash
sudo CERTBOT_EMAIL=care@novixa.vn bash /tmp/kit-platform-upload/deploy/ubuntu/bootstrap-vps.sh
```

Script tự động:

- Cài .NET 10, nginx, PostgreSQL, UFW
- Tạo DB `novixa_prod`, secrets
- Chạy migrations production (không seed demo)
- Tạo `/etc/kit-platform/api.env`
- SMS OTP stub (pilot)
- systemd `kit-platform-api`
- Certbot SSL (nếu DNS đã trỏ)

### 4.4 Cập nhật release (đã bootstrap)

1. Upload artifact mới  
2. Restart `kit-platform-api`  
3. Chạy migration nếu có (`run-migrations-prod.sh`)  
4. Smoke test: login admin, POS, health API  

Chi tiết runbook: NVX-OPS-02 *(Planned)*

---

## 5. Marketing site deploy

| Hạng mục | Giá trị |
|----------|---------|
| Host | Cloudflare Pages |
| Project | `KitPlatform` (root `novixa-site`) |
| Build | `npm run build` → `dist/` |
| Stats | GHA `novixa-update-stats.yml` → `stats-snapshot.json` |

Handoff: `.cursor/handoff/novixa-website.md`

---

## 6. DNS & SSL

| Record | Target |
|--------|--------|
| `A api/admin/app/pos` | VPS IP |
| `A novixa.vn` / `CNAME` | Cloudflare Pages |

SSL ERP: Certbot trên VPS. SSL marketing: Cloudflare.

---

## 7. Backup & monitoring (V1 minimum)

| Hạng mục | V1 |
|----------|-----|
| DB backup | `deploy/ubuntu/backup-db.sh` daily pg_dump |
| Log API | `journalctl -u kit-platform-api` |
| Uptime | Manual / UptimeRobot (Planned NVX-OPS-06) |
| Restore drill | NVX-OPS-03 Planned — **1 lần trước go-live tenant 2** |

---

## 8. Cấu hình production

- Template env: [docs/novixa-production.env.example](../../novixa-production.env.example)
- Hướng dẫn đầy đủ: [docs/novixa-deploy.md](../../novixa-deploy.md)
- Validate: `scripts/validate-production-config.ps1`

**Production checklist:** `client/admin/pilot-go-live-checklist.md`

---

## 9. Pilot vs Production flags

| Config | Pilot | Production khách |
|--------|-------|------------------|
| `CustomerAppSms__Provider` | Log / stub | Gateway thật |
| `CustomerAppAuth__ExposePilotOtp*` | true (nội bộ) | **false** |
| `NationalDrugCatalog__Mode` | mock | mock (V1) |
| Demo seed SQL | **Không** | **Không** |

---

## 10. Scale path (2027)

| Giai đoạn | Hạ tầng |
|-----------|---------|
| V1 | 1 VPS, 1 DB, ≤10 founding |
| Scale | Vertical VPS → read replica → shard theo vùng |
| Super Admin UI | Phase 2 — tạo tenant không cần SSH |

---

*Owner: DevOps · Review: mỗi thay đổi infra*
