# KitPlatform Customer App

App web khách hàng (PWA-friendly) — gọi API `/api/customer-app/*`.

## Chạy dev

```powershell
# Terminal 1: API (nếu chưa chạy)
.\scripts\restart-api.ps1

# Terminal 2: Customer App
.\run-customer-app.bat
# hoặc
cd client/customer-app && npm install && npm run dev
```

| URL | Mô tả |
|-----|--------|
| http://localhost:5174 | Customer App |
| http://localhost:5290/swagger | API Swagger |

## Demo login

- SĐT: `0909123456` (Trần Thị Mai)
- Tenant: `DEMO_PHARMACY`
- OTP (Development): `000000`

## Màn hình (P11a)

| Route | Mô tả |
|-------|--------|
| `/` | Trang chủ — dashboard, shortcuts |
| `/orders` | Draft orders, đã mua, đặt trước |
| `/reminders` | Nhắc uống thuốc, adherence, mua lại |
| `/chat` | Chat dược sĩ |
| `/loyalty` | Điểm, tier, voucher |
| `/profile` | Tài khoản, CDP, push, ngôn ngữ |
| `/health` | Hồ sơ sức khỏe, chỉ số, tái khám |
| `/family` | Gia đình |
| `/medications` | Thuốc đang dùng |
| `/pharmacy` | Hub nhà thuốc |
| `/ai` | AI health copilot (rule-based) |
| `/reservations` | Đặt trước sản phẩm |
| `/addresses` | Địa chỉ giao hàng |
| `/receivables` | Công nợ |
| `/notifications` | Thông báo in-app |

**Lộ trình:** đang **P11b** (production). Backlog P12+ → [roadmap](../../docs/novixa/07-customer/customer-app-roadmap-p12-p18.md).

## Cấu trúc

```
client/customer-app/src/
├── app/           # router, providers
├── modules/       # auth, home, loyalty, reminders, profile
└── shared/        # api, auth, layout
```

Checklist demo: [demo-customer-app-checklist.md](./demo-customer-app-checklist.md) · Admin [POS](../admin/demo-pos-checklist.md) · [Mua hàng](../admin/demo-procurement-checklist.md)

Lưu ý: chọn sản phẩm khi tạo nhắc thuốc tra cứu qua API `/catalog/products`. Đồng ý CDP (SMS/App push — nhắc chăm sóc) quản lý tại **Tài khoản**. Bật **Thông báo push** sau khi API có `CustomerAppPush` VAPID keys (dev đã cấu hình trong `appsettings.Development.json`).
