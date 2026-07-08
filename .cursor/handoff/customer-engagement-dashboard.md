# Customer Engagement Dashboard — spec ngắn (V2.0)

> Mục tiêu: **đo mỗi sáng** — biết bước nào trong funnel app khách đang vỡ, **không thêm module app**.

## 1. Vị trí & đối tượng

| Mục | Giá trị |
|-----|---------|
| **Admin** | Tab/màn **Customer Engagement** (cạnh Dashboard doanh thu hoặc trong menu Khách hàng) |
| **Quyền** | `customers.read` hoặc permission mới `customer_app.analytics` |
| **Phạm vi** | Theo `tenant_id` (+ optional `warehouse_id` nếu multi-branch) |
| **Kỳ mặc định** | 30 ngày rolling; so sánh kỳ trước (Δ %) |

## 2. Funnel (UI)

```
Khách có tài khoản app     ████████████  100%  (denominator)
        ↓
Đã đăng nhập app           ████████░░░░   62%  App Active
        ↓
Nhắc thuốc bật             ██████░░░░░░   48%  Reminder On
        ↓
Dùng AI (≥1 lần)           ████░░░░░░░░   35%  AI Usage
        ↓
Chat dược sĩ (≥1 tin)      ███░░░░░░░░░   25%  Chat
        ↓
Đặt lại / tái mua          ██░░░░░░░░░░   18%  Order Again
        ↓
Retention 30 ngày          ████████░░░░   71%  (parallel metric)
```

- Mỗi bước: **số tuyệt đối**, **% so với bước trên**, **% so với cohort**, **Δ vs 30 ngày trước**.
- Click bước → drill-down danh sách khách (SĐT, lần login cuối, trạng thái).

## 3. Định nghĩa metric (Phase 1 — chỉ SQL hiện có)

**Cohort (mẫu số chung):** khách có `customer_accounts.status = 1` và `customers.status = 1` trong tenant.

| Metric | Ý nghĩa UX | Numerator | Denominator | Nguồn DB hiện tại |
|--------|------------|-----------|-------------|-------------------|
| **App Active** | Đã cài / dùng app | `last_login_at IS NOT NULL` trong kỳ *hoặc* login ≥1 lần ever | Cohort accounts | `customer_accounts.last_login_at` |
| **Reminder On** | Có nhắc uống thực sự | Account có ≥1 `medication_reminders.is_active = TRUE` **hoặc** `repurchase_suggestions.drink_reminders_created_at IS NOT NULL` | App Active | `medication_reminders`, `repurchase_suggestions` |
| **Push On** *(sub)* | Nhận push được | `jsonb_array_length(device_tokens) > 0` **và** consent AppPush+CareReminder granted | App Active | `customer_accounts.device_tokens`, `customer_consents` |
| **AI Usage** | Hỏi Copilot ≥1 lần | Account có ≥1 ask trong kỳ | App Active | ⚠️ **Chưa có bảng** — xem §5 |
| **Chat** | Nhắn dược sĩ ≥1 lần | Customer có ≥1 `customer_chat_messages.sender_type = 1` trong kỳ | App Active | `customer_chat_messages` + `customer_chat_threads` |
| **Order Again** | Tái mua / đặt lại | Customer có **≥2** `sales_orders` completed **hoặc** ≥1 `customer_reservations` **hoặc** `repurchase_suggestions.drink_reminders_created_at` / accepted action trong kỳ | App Active (first purchase trước kỳ) | `sales_orders`, `customer_reservations`, `repurchase_suggestions` |
| **30d Retention** | Quay lại app | `last_login_at >= NOW() - 30d` | Accounts có `first_login_at` ≤ NOW()-30d | `customer_accounts.last_login_at`; cần thêm `first_login_at` §5 |

**Ghi chú định nghĩa:**
- *App Install* thực tế (PWA add-to-home) **không đo được** chính xác — Phase 1 dùng **App Active** (OTP login thành công) là proxy.
- *Reminder On* ≠ *Push On*: khách có lịch ERP nhưng chưa bật push vẫn tính Reminder On.

## 4. API (Admin)

```
GET /api/admin/customer-engagement/overview?periodDays=30&warehouseId=
```

**Response (rút gọn):**

```json
{
  "periodDays": 30,
  "cohortSize": 1200,
  "funnel": [
    { "key": "app_active", "label": "App Active", "count": 744, "rateFromCohort": 0.62, "rateFromPrevious": 1.0, "deltaVsPriorPeriod": 0.03 },
    { "key": "reminder_on", "count": 576, "rateFromCohort": 0.48, "rateFromPrevious": 0.77, "deltaVsPriorPeriod": -0.02 },
    { "key": "ai_usage", "count": 420, "rateFromPrevious": 0.73, "deltaVsPriorPeriod": 0.01 },
    { "key": "chat", "count": 300, "rateFromPrevious": 0.71, "deltaVsPriorPeriod": 0.05 },
    { "key": "order_again", "count": 216, "rateFromPrevious": 0.72, "deltaVsPriorPeriod": -0.01 }
  ],
  "retention30d": { "count": 528, "rate": 0.71, "deltaVsPriorPeriod": 0.02 },
  "alerts": [
    { "key": "reminder_on", "severity": "warning", "message": "Reminder On giảm 2% so với kỳ trước" }
  ]
}
```

```
GET /api/admin/customer-engagement/drill-down?step=reminder_on&periodDays=30&page=1
```

## 5. Migration tối thiểu (065)

```sql
-- first_login_at cho retention chuẩn
ALTER TABLE customer_accounts
  ADD COLUMN IF NOT EXISTS first_login_at TIMESTAMPTZ;
UPDATE customer_accounts SET first_login_at = last_login_at
  WHERE first_login_at IS NULL AND last_login_at IS NOT NULL;

-- log AI + (optional) app opens
CREATE TABLE customer_engagement_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id),
  account_id      UUID NOT NULL REFERENCES customer_accounts(id) ON DELETE CASCADE,
  customer_id     UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  event_type      VARCHAR(40) NOT NULL,  -- ai_ask | app_open | push_enable | reminder_create
  event_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata        JSONB NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX ix_customer_engagement_events_tenant_type_time
  ON customer_engagement_events (tenant_id, event_type, event_at DESC);
```

**Ghi event:**
| event_type | Khi nào |
|------------|---------|
| `ai_ask` | `POST /api/customer-app/ai-health/ask` success |
| `app_open` | OTP login success (1 lần/ngày/account) |
| `push_enable` | `POST /api/customer-app/push/subscribe` success |

## 6. UI Admin (Phase 1)

- **1 card funnel** (vertical bar hoặc Ant Design Steps + %).
- **1 tile Retention 30d** (số lớn + sparkline 12 tuần — Phase 2).
- **Bảng cảnh báo** khi Δ < -5% hoặc rate < ngưỡng tenant (config sau).
- **Drill-down** reuse pattern `CustomerLayout` list.

File gợi ý:
- `client/admin/src/modules/customer-engagement/CustomerEngagementPage.tsx`
- `src/KitPlatform.Api/Controllers/Admin/CustomerEngagementController.cs`
- `src/KitPlatform.Infrastructure/CustomerApp/CustomerEngagementAnalyticsRepository.cs`

## 7. Phase 2 (sau pilot)

- Push On / Consent funnel riêng.
- Cohort theo **first POS purchase** vs **account created**.
- Export CSV, ngưỡng alert Zalo/email cho GĐ NT.
- Không cần GA/Firebase nếu event nội bộ đủ.

## 8. Effort ước lượng

| Hạng mục | Effort |
|----------|--------|
| Migration 065 + ghi event AI/login | 0.5 ngày |
| Analytics repository + API | 1 ngày |
| Admin UI funnel + drill-down | 1–1.5 ngày |
| **Tổng Phase 1** | **~3 ngày dev** |

## 9. Tiêu chí done

- [x] Migration 065 + event log (`ai_ask`, `app_open`, `push_enable`)
- [x] API `GET /api/customer-engagement/overview` + `drill-down`
- [x] Admin **Khách hàng → Engagement app** (`/customer/engagement`)
- [ ] Sáng mở admin thấy funnel 6 bước + retention, refresh ≤3s (tenant demo ~5k accounts).
- [ ] Số **Reminder On** khớp manual count ±1% trên `DEMO_PHARMACY`.
- [ ] Click drill-down ra đúng danh sách khách thiếu bước.
- [ ] AI Usage > 0 sau khi demo hỏi Copilot 1 câu.

## Chạy dev

```powershell
.\scripts\restart-api.ps1    # gồm migration 065
# Admin: http://localhost:5173 → Khách hàng → Engagement app
```
