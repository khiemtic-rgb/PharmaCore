# KitPlatform · Customer App — P9: Thông báo & vòng chăm sóc

> Migration: `063_p9_engagement_notifications.sql`
> Worker: `MedicationReminderPushWorker` (+ engagement dispatch)

## ĐÃ XONG (P9)

### Backend
- `care_reminders.due_notified_at`, `advance_notified_at` — tránh spam push
- `repurchase_suggestions.notified_at`
- `customer_adherence_alert_dispatches` — nhắc bỏ liều tối đa 1 lần/ngày
- `CustomerEngagementRepository` + `DispatchEngagementNotificationsAsync`:
  - Nhắc tái khám trước 24h + đến giờ → `customer_notifications` + push
  - Đơn sắp hết thuốc → `/medications`
  - Bỏ liều ≥3 ngày → `/reminders`
- Tạo care reminder → thông báo in-app ngay (category `care`)

### Customer app UI
- `FamilyCaregiverDuePanel` — nút Đã uống / Nhắc sau / Bỏ qua
- Thông báo: category `care`, dedupe local vs server
- Home refresh sau caregiver respond

## CHƯA LÀM (backlog P10+)

- i18n EN (`preferred_locale`)
- Gia đình đa tài khoản (caregiver trên app riêng)
- Production PWA / VAPID thật
- LLM Copilot (đã chốt rule-based)

## Chạy

```powershell
.\scripts\run-migrations.ps1
.\scripts\restart-api.ps1
cd client\customer-app; npm run dev
```
