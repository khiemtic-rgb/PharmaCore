# PharmaCore Customer App

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

## Màn hình

- **Trang chủ** — tóm tắt điểm & nhắc thuốc
- **Điểm thưởng** — số dư, lịch sử, voucher
- **Nhắc thuốc** — CRUD lịch uống thuốc
- **Tài khoản** — profile & đăng xuất

## Cấu trúc

```
client/customer-app/src/
├── app/           # router, providers
├── modules/       # auth, home, loyalty, reminders, profile
└── shared/        # api, auth, layout
```

Lưu ý: chọn sản phẩm khi tạo nhắc thuốc tạm dùng danh sách demo — sẽ thay bằng API tra cứu sản phẩm cho khách ở bước sau.
