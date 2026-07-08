# Customer app P11a — Pilot nhà thuốc (production)

> Sau P10c i18n. Tài liệu push chi tiết: [docs/customer-app-push-pilot.md](../../docs/customer-app-push-pilot.md)

## Checklist pilot 1 NT

### 1. Hạ tầng

- [ ] Domain HTTPS: `https://app.<tenant>.vn` (customer SPA)
- [ ] API production: `https://api.<tenant>.vn`
- [ ] PostgreSQL production + chạy migrations tới `064`
- [ ] CORS: origin app + admin trong `Cors:AllowedOrigins`

### 2. VAPID & push

```powershell
.\scripts\generate-vapid-keys.ps1 -Subject "mailto:care@domain.vn"
```

- [ ] Gán `CustomerAppPush:PublicKey` / `PrivateKey` (env hoặc `appsettings.Production.json`)
- [ ] `CustomerAppPush:Enabled=true`, `PollIntervalSeconds=60`
- [ ] Verify: `.\scripts\verify-push-config.ps1 -BaseUrl https://api.domain.vn`
- [ ] Restart API (worker push chạy cùng process)

### 3. Build & deploy app khách

```powershell
cd client\customer-app
npm ci
npm run build
# deploy dist/ → CDN hoặc static host HTTPS
```

- [ ] `VITE_API_BASE` trỏ đúng API production (nếu dùng env build)
- [ ] PWA manifest + service worker hoạt động trên HTTPS
- [ ] Test đăng nhập OTP thật (SMS) — không dùng bypass dev

### 4. Tenant & branding

- [ ] Admin: cài đặt app khách (logo, màu, tagline)
- [ ] `settings.platform.i18n.supported_locales`: `["vi-VN","en-US"]` nếu pilot song ngữ
- [ ] SĐT hỗ trợ (`support_phone`) cho Pharmacy hub

### 5. UAT trên thiết bị thật

| # | Kịch bản |
|---|----------|
| 1 | Đăng nhập OTP → Home |
| 2 | Profile → bật push → nhận nhắc uống thuốc |
| 3 | Profile → English → UI chuyển ngôn ngữ, refresh giữ locale |
| 4 | Nhắc tái khám / hết đơn → thông báo in-app + push |
| 5 | Chat dược sĩ (consent + tin nhắn) |
| 6 | Đặt thuốc / đơn POS |

### 6. Giám sát

- Log API: lỗi push subscription, VAPID mismatch
- Xác nhận `customer_accounts.preferred_locale` lưu khi đổi EN
- Rollback: tắt `CustomerAppPush:Enabled` nếu spam

## Lệnh dev trước khi lên production

```powershell
.\scripts\restart-api.ps1    # migration 064 + build API
.\scripts\smoke-test-dev.ps1
cd client\customer-app; npm run build
```

## Out of scope P11a

- SMS OTP provider production (cấu hình riêng tenant)
- Đa tài khoản caregiver
- LLM Copilot
- Dịch nội dung server (notification title từ API) — backlog P11b
