# Novixa — Danh mục module V1

**Mã:** NVX-PRD-02 · **Tier:** T1/T2 · **Trạng thái:** Draft · **Version:** 1.0

> **Legend:** ✅ Hoàn thành Phase 1 · 🧪 Pilot · 📋 Roadmap · ❌ Ngoài V1

---

## Admin Web (`client/admin`)

| Module | Path | Chức năng chính | V1 |
|--------|------|-----------------|-----|
| **Dashboard** | `/` | Doanh thu, KPI tổng quan | ✅ |
| **Sales / POS** | `/sales/*` | POS, đơn bán, trả hàng, ca, cài bill | ✅ |
| **Sales — e-Rx** | `/pharmacy/prescriptions/*` | Đơn BS, BS liên kết, bán Rx strict, portal BS | 🧪 Pilot — [rx-prescription-module-v1.md](./rx-prescription-module-v1.md) · [network](./rx-prescriber-network-v1.md) |
| **Sales — O2O** | `/sales/*` | Đơn app khách, đặt trước, chat KH | ✅ |
| **Procurement** | `/procurement/*` | NCC, PO, GRN, thuế GTGT cơ bản | ✅ |
| **Procurement — AP** | `/procurement/*` | Công nợ NCC, thanh toán NCC | ✅ |
| **Inventory** | `/inventory/*` | Tồn, kho, nhập đầu kỳ, chuyển, điều chỉnh | ✅ |
| **Inventory — Count** | `/inventory/*` | Kiểm kê chu kỳ, workflow duyệt | ✅ |
| **Inventory — Alerts** | `/inventory/*` | Cảnh báo tồn thấp, cận date | ✅ |
| **Receivables** | `/receivables/*` | Công nợ KH, thu nợ | ✅ |
| **Customer / CRM** | `/customer/*` | Hồ sơ KH, loyalty, voucher, engagement | ✅ |
| **Catalog** | `/catalog/*` | SP, danh mục, thương hiệu, hoạt chất, import Excel | ✅ |
| **Catalog — Drug DB** | `/catalog/*` | Tra cứu thuốc QG (mock) | 🧪 |
| **Reports** | `/reports/*` | Wave 1 — 9 báo cáo | ✅ |
| **Reports — Tax deep** | `/reports/*` | Báo cáo thuế, export KT | 📋 Phase 2 |
| **System** | `/system/*` | User, role, chi nhánh, audit, cài POS/app | ✅ |
| **Platform setup** | `/setup` | Tạo tenant SaaS | ✅ |

**Registry:** `client/admin/src/modules/registry.tsx`

---

## Báo cáo Wave 1

| Mã | Tên | Module |
|----|-----|--------|
| SALES-01 | Doanh thu theo thời gian | Sales |
| SALES-02 | Doanh thu theo hình thức TT | Sales |
| SALES-03 | Báo cáo ca | Sales |
| SALES-04 | Doanh thu theo danh mục | Sales |
| PROC-01 | Giá trị nhập GRN | Procurement |
| PROC-03 | Công nợ NCC | Procurement |
| INV-01 | Tồn kho hiện tại | Inventory |
| INV-02 | Hàng cận date / HSD | Inventory |
| INV-03 | Tóm tắt xuất nhập tồn | Inventory |

Chi tiết: `client/admin/REPORTS_WAVE1.md`

---

## Customer App (`client/customer-app`)

| Module | Route | Chức năng | V1 |
|--------|-------|-----------|-----|
| Auth | `/login` | OTP theo SĐT | ✅ |
| Home | `/` | Điểm, nhắc uống thuốc | ✅ |
| Loyalty | `/loyalty` | Điểm, voucher | ✅ |
| Reminders | `/reminders` | Nhắc uống thuốc, tái mua | ✅ |
| Orders | `/orders` | Đơn nháp O2O, lịch sử | ✅ |
| Chat | `/chat` | Chat dược sĩ (consent) | ✅ |
| Reservations | `/reservations` | Giữ hàng | ✅ |
| Receivables | `/receivables` | Công nợ KH | ✅ |
| Health wallet | `/health` | Hồ sơ sức khỏe | ✅ |
| Family | `/family` | Thành viên gia đình | ✅ |
| AI health | `/ai` | Copilot rule-based | 🧪 |
| Profile | `/profile` | Consent, push, locale | ✅ |

---

## Staff POS Mobile (`client/staff-app`)

| Màn hình | Chức năng | V1 |
|----------|-----------|-----|
| Hub | Điều hướng nhanh | ✅ |
| POS / Checkout | Bán hàng mobile | ✅ |
| Ca / Today | Ca làm việc | ✅ |
| Returns | Trả hàng | ✅ |
| Stock lookup | Tra tồn | ✅ |
| Chat / Orders | O2O hỗ trợ | ✅ |

Spec wireframe: `.cursor/handoff/staff-mobile-p1-wireframes.md`

---

## API (tóm tắt domain)

| Domain | Prefix | Ghi chú |
|--------|--------|---------|
| Auth & Platform | `/api/auth`, `/api/platform` | JWT, tenant provision |
| Catalog | `/api/catalog/*` | |
| Inventory | `/api/inventory/*` | FEFO, batches |
| Procurement | `/api/procurement/*` | |
| Sales | `/api/sales/*` | POS, shifts |
| Customers & Loyalty | `/api/customers/*`, `/api/loyalty/*` | |
| Customer App | `/api/customer-app/*` | 20+ controllers |
| Reports | `/api/reports/*` | |
| Integration | `/api/integration/*` | Webhook, CDP |

---

## Marketing site (novixa-site)

| Thành phần | V1 |
|------------|-----|
| Trang chủ, Giải pháp, Về, Liên hệ | ✅ |
| Founding block + FAQ | ✅ |
| Tin tức SEO (23+ bài) | ✅ |
| Thống kê `/vi/thong-ke` | ✅ |
| EN site | 📋 |

**Không kết nối DB ERP.**

---

## Giới hạn cần nói rõ khi bán

| Hạng mục | Trạng thái |
|----------|------------|
| Danh mục thuốc QĐ 522 live API | Mock / roadmap |
| HĐĐT | Roadmap Phase 2 |
| Super Admin UI | Script/bootstrap |
| SMS OTP production | Cần gateway / tenant config |
| AI Copilot | Rule-based, không thay dược sĩ |

---

*Owner: Product · Sync với PHASE_SCOPE.md mỗi release*
