# KitPlatform · Customer App — P5: Novixa Care hub

> Chat title: **KitPlatform · App khách & Pilot NT**
> Migrations: `052`–`056` (+ `051` platform)
> Demo: SĐT `0909123456`, tenant `DEMO_PHARMACY`, OTP `000000`

## ĐÃ XONG (P5)

### Backend
- `family_members` + API `/api/customer-app/family`
- `health_records` + `/api/customer-app/health-records`
- `care_reminders` + `/api/customer-app/care-reminders`
- `repurchase_suggestions` + order reminder trên `sales_orders`
- White-label `/api/customer-app/branding?tenantCode=`
- `medication_reminders.family_member_id`

### Customer app UI
- **BrandingProvider** — header app name, màu, tagline theo tenant
- **Trang chủ** — card sức khỏe, gia đình, badge nhắc hết đơn
- **Nhắc thuốc** — block nhắc hết đơn + Tạo nhắc uống (giữ card sau khi tạo)
- **Hồ sơ sức khỏe** `/health` — hồ sơ + nhắc tái khám
- **Gia đình** `/family` — CRUD người thân
- **Tài khoản** — link Sức khỏe & Gia đình

## Chạy

```powershell
.\scripts\run-migrations.ps1
.\scripts\restart-api.ps1
cd client\customer-app; npm run dev
```

## CHƯA LÀM (backlog)

- Upload file đính kèm hồ sơ SK
- i18n EN (`preferred_locale`)
- AI Health: nâng cấp LLM/RAG (hiện rule-based pilot)
- Family caregiver push (con nhận khi mẹ đến giờ uống)
- Notification center server-side phân loại

## P6 (mới)

- Migration `057` — `medication_adherence_events`
- API: `/active-medications`, `/medication-adherence/*`, `/ai-health/ask`
- UI: Home dashboard, My Medication, Pharmacy hub, AI Copilot, reminder tương tác
