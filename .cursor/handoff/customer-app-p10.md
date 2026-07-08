# Customer app P10 — Push pilot (P10a) + i18n (P10b)

## P10a — Production push

- Sinh VAPID: `.\scripts\generate-vapid-keys.ps1 -Subject "mailto:care@domain.vn"`
- Gán keys vào `appsettings.Production.json` → `CustomerAppPush`
- Kiểm tra: `.\scripts\verify-push-config.ps1 -BaseUrl https://api.domain.vn`
- Hướng dẫn pilot NT: [docs/customer-app-push-pilot.md](../../docs/customer-app-push-pilot.md)

## P10b — i18n (vi-VN / en-US)

### Migration

```powershell
.\scripts\run-migrations.ps1   # gồm 064_p10b_customer_app_i18n.sql
```

- Bật `en-US` trên `platform_locales`
- DEMO_PHARMACY: `supported_locales` = `["vi-VN","en-US"]`
- Seed nhãn EN trong `tenant_string_translations`

### API

| Endpoint | Mô tả |
|----------|--------|
| `GET /api/customer-app/auth/me` | Trả `preferredLocale` |
| `PATCH /api/customer-app/auth/locale` | Body `{ "preferredLocale": "en-US" }` |
| `GET /api/customer-app/branding` | Thêm `defaultLocale`, `supportedLocales` |

### Customer app

- `i18next` + `react-i18next` — `client/customer-app/src/shared/i18n/`
- Chọn ngôn ngữ: **Tài khoản → Ngôn ngữ**
- Pilot dịch: bottom nav, Trang chủ, menu Tài khoản

### Dev

```powershell
.\scripts\restart-api.ps1
cd client\customer-app; npm install; npm run dev
```

Demo: `DEMO_PHARMACY` / `0909123456` / OTP `000000` — đổi EN ở Profile, refresh vẫn giữ locale (DB + localStorage).
