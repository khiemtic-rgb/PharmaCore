# Novixa — Enterprise Architecture Gap Matrix V1

**Mã:** NVX-SOL-06 · **Tier:** T2/T3 · **Trạng thái:** Draft · **Version:** 1.2  
**Ngày kiểm tra code:** 2026-07-05 (pass 1–3) · **Repo:** KitPlatform (modular monolith)  
**Evolution active:** [enterprise-architecture-evolution-v1.md](./enterprise-architecture-evolution-v1.md) (NVX-SOL-07)

> **Mục đích:** Bản đồ khoảng trống theo Enterprise Architecture (Outcomes → Standards → Policies → Domains → Capabilities → Workflows/Rules → Services → Platform), **không** theo checklist tính năng UI.  
> **Cách dùng:** Founder / Product / Engineering review backlog kiến trúc; cập nhật cột *Đã có?* khi trích xuất Engine hoặc thêm Standard.

---

## 1. Kết luận kiểm tra

| Câu hỏi | Kết quả |
|---------|---------|
| Có khớp stack EA đầy đủ không? | **Không** — V1 là modular monolith vận hành được |
| Có Core Engine dùng chung không? | **Một phần (G2b)** — 5 engine wired; **Audit write-path** qua `IAuditEngine` |
| Có truy vết Outcome ← Capability không? | **Chưa** |
| Có NSF (Business Standards) không? | **Có tối thiểu** — `docs/novixa/standards/` (6 NSF) |
| Có Policy catalog không? | **Có tối thiểu** — `docs/novixa/policies/` |
| Core Engine interfaces? | **Có mầm formal** — `IInventoryEngine`, `IPricingEngine`, `IPermissionEngine`, `IAuditEngine`, `IAiOrchestrator` |
| Microservices / BFF / API Gateway? | **Chưa** — Frontend → `KitPlatform.Api` trực tiếp |
| AI qua Knowledge / Rule / Policy? | **Một phần (G2)** — `IAiOrchestrator` + Care/Knowledge contracts; Copilot không SQL; chưa tenant KB / LLM |

**Định vị đúng:** Foundation ERP + Care channel đủ pilot. EA đầy đủ là target 3–5 năm. Ưu tiên **Standards + Core Engines trong monolith**, không tách microservices sớm.

---

## 2. Stack mục tiêu vs thực tế

```
MỤC TIÊU                         THỰC TẾ (2026-07)
─────────                        ─────────────────
Business Outcomes                KPI rời (Dashboard, Engagement) — không map
Business Standards (NSF)         ❌ không có
Business Policies                ⚠️ Consent + RBAC + audit (chưa catalog)
Domains (DDD)                    ⚠️ folder module kỹ thuật
Capabilities                     ✅ feature/API
Workflows & Business Rules       ⚠️ nhúng code / static class
Application Services (MS)        ⚠️ class trong 1 API deployable
Platform / AI / Data             ⚠️ PostgreSQL + Outbox HTTP; không Redis/MQ/ES/K8s
```

**Luồng kỹ thuật thực tế**

```
Admin Web / Customer App / Staff App
        │ REST
        ▼
KitPlatform.Api  (monolith)
        │
        ▼
Application contracts + Infrastructure services/repositories
        │
        ▼
PostgreSQL (shared schema, tenant_id)
        + IntegrationOutboxWorker → HTTP webhook
        + MedicationReminderPushWorker
```

**AI thực tế (G2)**

```
Customer App → POST /api/customer-app/ai-health/ask
            → IAiOrchestrator (BR-AI-001)
            → CustomerAiHealthService
            → IAiCareContextProvider / ICareProductLookup (SQL ở Infrastructure/Care)
            → IDrugKnowledgeQuery (DrugKnowledgeRules)
```

Mục tiêu LLM: thêm Knowledge store + Policy gate trước khi gọi model — không SQL trong AI layer.

---

## 3. Bản đồ Code → Core Engine

Implementation classes: `PricingEngine`, `PermissionEngine`, `AuditEngine`, `AiOrchestrator`, `BatchResolver` (`IInventoryEngine`).

| Engine mục tiêu | Code hiện tại | Path | Mức |
|-----------------|---------------|------|-----|
| **Inventory Engine** | `IInventoryEngine` = `BatchResolver` (FEFO) | `Application/Core/Engines/IInventoryEngine.cs` | ✅ formal (wrap) |
| **Pricing Engine** | `IPricingEngine` → `SalesPricing` / `ProcurementPricing` | `Infrastructure/Core/Engines/PricingEngine.cs` | ✅ formal (wrap) |
| **Permission Engine** | `IPermissionEngine` | `Infrastructure/Core/Engines/PermissionEngine.cs` | ✅ formal (wrap) |
| **Audit Engine** | `IAuditEngine` → `IAuditLogService` | `Infrastructure/Core/Engines/AuditEngine.cs` | ✅ wired (Sales, Inventory, Procurement write) |
| **AI Orchestrator** | `IAiOrchestrator` → `ICustomerAiHealthService` | `Infrastructure/Core/Engines/AiOrchestrator.cs` | ✅ entry path |
| **Notification Engine** | `CustomerPushService`, OTP, push worker | `Infrastructure/CustomerApp/*` | ⚠️ chưa interface Engine |
| **Recommendation Engine** | `CustomerRepurchaseService` | `Infrastructure/CustomerApp/CustomerRepurchase*` | ⚠️ |
| **Event Bus** | `IntegrationOutboxWriter` + Worker | `Infrastructure/Integration/*` | ⚠️ outbound only |
| **Knowledge Engine** | `CustomerDrugKnowledge` (static) | `Infrastructure/CustomerApp/CustomerDrugKnowledge.cs` | ❌ giả knowledge |
| Rule / Workflow / Decision / Forecast / Promotion formal | — | — | ❌ |

**Call-site cũ** (`IBatchResolver`, `SalesPricing` static) **giữ nguyên** — migrate dần sang Engine (G2).

---

## 4. Truy vết Outcome (mẫu)

| Outcome (L1) | Capability liên quan | Metric hiện có? | Gap |
|--------------|----------------------|-----------------|-----|
| Giảm thuốc cận hạn | Batch / Expiry reports | INV-02 HSD | Không gắn target/outcome ID |
| Giảm tồn chết | Low stock, reorder | Low stock settings | Không Forecast/Reorder proposal |
| Tăng khách quay lại | Loyalty, repurchase, engagement | Engagement funnel, loyalty | Không retention outcome model |
| Dùng thuốc đúng hơn | Adherence, reminders | `medication_adherence_events` | Không adherence rate KPI chuẩn |
| Hồ sơ SK thống nhất | Health wallet, family | Tables + API | Không “single journey” ID |
| Giảm sai sót bán | FEFO, discount policy, audit | FEFO + discount limits | Không incident/error rate |

---

## 5. Enterprise Architecture Matrix

Ký hiệu: ✅ V1 đủ · ⚠️ một phần / nhúng · ❌ chưa

### 5.1 Customer Domain

| Capability | Workflow | Rule (hiện) | Engine | Service (class) | Đã có? | Thiếu gì? |
|------------|----------|-------------|--------|-----------------|--------|-----------|
| Customer Profile | Tạo/cập nhật KH | Validate tenant/SĐT | — | `CustomerAdminService` | ✅ | Merge, deactivate chuẩn, timeline |
| Customer Search | Tìm KH | — | — | Customers API | ✅ | Search platform (ES) |
| Family | CRUD người thân | `family_members` | — | `CustomerFamilyService` | ✅ | Caregiver multi-account |
| Consent | Grant/revoke | Consent channels/purposes | — | `CustomerAppConsentService` | ✅ | Privacy Policy catalog, retention |
| Loyalty | Tích/đổi điểm | Program/tier rules | — | `LoyaltyAdminService`, `CustomerLoyaltyService` | ✅ | Segmentation |
| Communication | Chat | Consent chat | — | `CustomerChatService` | ✅ | Zalo/email |
| Caregiver | — | — | — | — | ❌ | Toàn bộ |
| Import/Export | Import KH | — | — | `CustomerImportService` | ⚠️ | Export chuẩn |

### 5.2 Medication Domain

| Capability | Workflow | Rule | Engine | Service | Đã có? | Thiếu gì? |
|------------|----------|------|--------|---------|--------|-----------|
| Drug master | CRUD SP, hoạt chất | `drug_type`, units | — | `CatalogService`, `ActiveIngredientService` | ⚠️ | Clinical fields |
| National drug | Tra cứu QG | Mock mode | — | `MockNationalDrugCatalogService` | ⚠️ | Live API |
| Prescription | — | — | — | — | ❌ | Rx entity + verify |
| Interaction | — | Hardcode AI | — | `CustomerDrugKnowledge` | ❌ | Interaction DB + Knowledge |
| Reminder (thuốc) | Nhắc uống | Schedule | — | `CustomerReminderService` | ✅* | *Đang Care/CustomerApp |

### 5.3 Inventory Domain

| Capability | Workflow | Rule | Engine | Service | Đã có? | Thiếu gì? |
|------------|----------|------|--------|---------|--------|-----------|
| Receiving | GRN | Batch, VAT | Pricing procurement | `GoodsReceiptService` | ✅ | |
| Transfer | Điều chuyển | `stock_movements` | Inventory mầm | Inventory | ✅ | |
| Stock Count | Kiểm kê | Adjustment status | — | Inventory | ✅ | |
| Batch / Expiry | FEFO pick | FEFO | **BatchResolver** | Sales/Inventory | ✅ | Formal Inventory Engine |
| Low stock | Cảnh báo | Min stock | — | `LowStockSettingsService` | ⚠️ | Reorder proposal |
| Forecast / Reorder | — | — | Forecast Engine | — | ❌ | |
| Supplier performance | — | — | — | — | ❌ | |

### 5.4 Sales Domain

| Capability | Workflow | Rule | Engine | Service | Đã có? | Thiếu gì? |
|------------|----------|------|--------|---------|--------|-----------|
| POS | Checkout + ca | Discount policy, FEFO | Pricing mầm | `SalesService` | ✅ | |
| Order O2O | Draft / reservation | Hold stock | — | Draft/Reservation services | ✅ | `family_member_id` trên đơn |
| Invoice | Hóa đơn bán | — | — | Sales | ✅ | HĐĐT |
| Return / Refund | Trả hàng | AR adjust | — | Sales | ✅ | |
| Shift | Mở/đóng ca | — | — | Sales | ✅ | |

### 5.5 Procurement Domain

| Capability | Workflow | Rule | Engine | Service | Đã có? | Thiếu gì? |
|------------|----------|------|--------|---------|--------|-----------|
| Supplier | CRUD | Status | — | `SupplierService` | ✅ | |
| PO | Tạo/duyệt | Status, VAT | — | `PurchaseOrderService` | ✅ | |
| Receiving | GRN | Pricing receipt | — | `GoodsReceiptService` | ✅ | |
| AP | Thanh toán NCC | — | — | `SupplierPaymentService` | ✅ | |

### 5.6 Pricing Domain

| Capability | Workflow | Rule | Engine | Service | Đã có? | Thiếu gì? |
|------------|----------|------|--------|---------|--------|-----------|
| Price | Tính giá dòng | `SalesPricing` | Pricing Engine | nhúng Sales | ⚠️ | Domain tách, versioning |
| Promotion | Voucher redeem | Max redeem % | Promotion Engine | `VoucherPosService` | ⚠️ | Campaign engine |

### 5.7 Finance Domain

| Capability | Workflow | Rule | Engine | Service | Đã có? | Thiếu gì? |
|------------|----------|------|--------|---------|--------|-----------|
| Payment | TT đơn / thu nợ | — | — | `CustomerPaymentService` | ✅ | |
| Debt AR/AP | Công nợ | — | — | Receivables / Payables | ✅ | |
| Revenue | Báo cáo | — | — | `ReportsService` | ✅ | |
| Expense / GL | — | — | — | — | ❌ | |

### 5.8 Care Domain

| Capability | Workflow | Rule | Engine | Service | Đã có? | Thiếu gì? |
|------------|----------|------|--------|---------|--------|-----------|
| Health wallet | CRUD hồ sơ | Record types | — | `CustomerHealthService` | ⚠️ | Journey ID thống nhất |
| Care reminders | Nhắc tái khám | Types visit/lab/… | — | `CustomerCareReminderService` | ✅ | |
| Adherence | Taken/snooze/skip | Response enum | — | `CustomerMedicationAdherenceService` | ✅ | Alert Decision Engine |
| Repurchase | Gợi ý tái mua | Supply end | Reco mầm | `CustomerRepurchaseService` | ⚠️ | Recommendation Engine |
| Active meds | Timeline thuốc | — | — | `CustomerActiveMedicationService` | ⚠️ | Theo family member |

### 5.9 AI Domain

| Capability | Workflow | Rule | Engine | Service | Đã có? | Thiếu gì? |
|------------|----------|------|--------|---------|--------|-----------|
| Copilot | Ask | Regex + profiles | — | `CustomerAiHealthService` | ⚠️ | Orchestrator, Policy gate, no direct DB |
| Recommendation | Repurchase | SQL | Reco | CustomerApp | ⚠️ | Feedback loop |
| Forecast / Risk / Insights | — | — | — | — | ❌ | |
| Engagement metrics | Funnel | Event types | — | `CustomerEngagementAnalyticsService` | ⚠️ | Không phải AI engine |

### 5.10 Reporting Domain

| Capability | Workflow | Rule | Engine | Service | Đã có? | Thiếu gì? |
|------------|----------|------|--------|---------|--------|-----------|
| Dashboard | KPI tổng quan | — | — | `DashboardService` | ✅ | Outcome-linked KPIs |
| Reports Wave 1 | 9 báo cáo | Report permissions | — | `ReportsService` | ✅ | BI warehouse |
| Engagement analytics | Overview/drill-down | — | — | Engagement API | ⚠️ | |

### 5.11 Identity Domain

| Capability | Workflow | Rule | Engine | Service | Đã có? | Thiếu gì? |
|------------|----------|------|--------|---------|--------|-----------|
| Staff auth | Login JWT | — | Permission mầm | `AuthService` | ✅ | |
| Customer auth | OTP | Pilot OTP | — | `CustomerAppAuthService` | ✅ | Production SMS |
| RBAC | Role/permission | Policy codes | Permission Engine | `IdentityAdminService` | ✅ | Feature flag / ABAC |
| Organization | Tenant/branch | — | — | `PlatformTenantService` | ✅ | Org hierarchy sâu |

### 5.12 Notification Domain

| Capability | Workflow | Rule | Engine | Service | Đã có? | Thiếu gì? |
|------------|----------|------|--------|---------|--------|-----------|
| Push | Web push | Consent | — | `CustomerPushService` | ⚠️ | Multi-channel engine |
| SMS | OTP | Stub/log | — | OTP senders | ⚠️ | Gateway thật, Zalo, Email |
| In-app | Notification center | — | — | `CustomerNotificationService` | ✅ | |

### 5.13 Integration Domain

| Capability | Workflow | Rule | Engine | Service | Đã có? | Thiếu gì? |
|------------|----------|------|--------|---------|--------|-----------|
| Outbox webhook | Consent events | Signature | Event mầm | `IntegrationOutbox*` | ⚠️ | Internal event bus |
| HIS / Insurance / Marketplace | — | — | — | — | ❌ | Ecosystem |
| Partner Open API | — | — | — | — | ❌ | |

### 5.14 Master Data Domain

| Capability | Workflow | Rule | Engine | Service | Đã có? | Thiếu gì? |
|------------|----------|------|--------|---------|--------|-----------|
| Drug / brand / unit | Catalog CRUD | — | — | Catalog | ⚠️ | Disease, diagnosis |
| National dictionary | Mock | — | — | National drug mock | ⚠️ | Live |

### 5.15 Knowledge Domain

| Capability | Workflow | Rule | Engine | Service | Đã có? | Thiếu gì? |
|------------|----------|------|--------|---------|--------|-----------|
| BR catalog | — | Rules trong code | Knowledge Engine | — | ❌ | **Điểm khác biệt — chưa có** |
| Glossary / ADR | Docs rời | — | — | — | ❌ | Decision records |
| AI Knowledge | Hardcode | — | — | `CustomerDrugKnowledge` | ❌ | Tenant KB + RAG source |
| SOP / FAQ nội bộ | Marketing only | — | — | novixa-site | ❌ | In-product KB |

---

## 6. Cross-cutting services

| Shared | Mục tiêu EA | Hiện tại |
|--------|-------------|----------|
| Audit | Mọi thay đổi | ⚠️ một phần write path |
| Rule Engine | BR tập trung | ❌ |
| Workflow Engine | Orchestration | ❌ |
| Event Bus | Domain events | ⚠️ Outbox outbound |
| Search | Full-text | ❌ SQL ILIKE |
| Observability | Metrics/traces | ⚠️ logs cơ bản |
| Permission | RBAC | ✅ mầm |
| Feature Flag | Toggle | ❌ |
| AI Orchestrator | Safe AI path | ❌ |
| Knowledge Graph | — | ❌ |

---

## 7. Backlog kiến trúc (ưu tiên)

| Prio | Việc | Outcome |
|------|------|---------|
| **P0** | Viết NSF tối thiểu (Customer, Inventory, Care, Medication, Data, AI) | Feature không tồn tại ngoài Standard |
| **P0** | Policy catalog (Privacy, Audit, AI, Security) | Rules có nguồn |
| **P0** | Formalize 3 engine interfaces: Inventory, Pricing, Permission/Audit | Core bắt đầu là tài sản |
| **P1** | AI Policy gate: cấm SQL trực tiếp; context qua Care/Medication contracts | AI an toàn |
| **P1** | Knowledge Domain v0: bảng KB tenant + seed drug guidance | Nguồn RAG |
| **P2** | Recommendation Engine từ repurchase | Outcome tái mua |
| **P2** | Medication: interaction + Rx hooks | Clinical path |
| **P3** | BFF / Gateway / microservices | Chỉ khi boundary ổn |

**Không làm sớm:** tách microservices, Kafka, K8s — trước khi Engine + Domain contract ổn định trong monolith.

---

## 8. Pass 2 — Điểm số Domain & coupling

### 8.1 Scorecard 15 Domain (Capability coverage ước lượng)

| Domain | Score | Lý do ngắn |
|--------|------:|------------|
| Inventory | **80%** | FEFO, movements, count, transfer, low stock — thiếu Forecast/Reorder |
| Sales | **75%** | POS, O2O, return, shift — thiếu HĐĐT, family trên đơn |
| Procurement | **75%** | Supplier, PO, GRN, AP |
| Identity | **70%** | JWT, RBAC, tenant/branch — thiếu feature flag |
| Finance | **65%** | AR/AP, payment, revenue reports — thiếu expense/GL |
| Customer | **65%** | Profile, family, consent, loyalty, chat — thiếu merge/caregiver/segment |
| Reporting | **60%** | Dashboard + Wave 1 + engagement — thiếu BI/outcome model |
| Care | **55%** | Reminders, adherence, health wallet, repurchase — thiếu journey ID |
| Notification | **40%** | Push + in-app + OTP stub — thiếu multi-channel engine |
| Pricing | **35%** | Logic có nhưng **nhúng Sales/Procurement**, chưa domain |
| Master Data | **35%** | Catalog thương mại — thiếu disease/diagnosis, national live |
| Integration | **20%** | Outbound outbox only |
| Medication | **20%** | Catalog + hardcode AI — không clinical domain |
| AI | **15%** | Rule-based + metrics — không orchestrator/engines |
| Knowledge | **5%** | Không có |

**Trung bình có trọng số vận hành (Inventory/Sales/Procurement/Identity/Customer/Care):** ~**68%** — đủ pilot.  
**Trung bình EA dài hạn (thêm Medication/AI/Knowledge/Integration/Pricing formal):** ~**48%**.

### 8.2 Anti-pattern: `CustomerApp` là kênh, không phải Domain

DI đăng ký **>20** service dưới `CustomerApp` — thực tế **xuyên 6+ domain EA**:

| Class (DI) | Domain EA đúng |
|------------|----------------|
| `CustomerFamilyService`, `CustomerAppConsentService` | Customer |
| `CustomerHealthService`, `CustomerCareReminderService`, `CustomerMedicationAdherenceService`, `CustomerReminderService`, `CustomerRepurchaseService`, `CustomerActiveMedicationService` | Care (+ Medication reminder) |
| `CustomerDraftOrderService`, `CustomerReservationService`, `CustomerPurchaseService`, `CustomerAppReceivablesService` | Sales / Finance |
| `CustomerLoyaltyService` | Customer / Pricing-Promotion |
| `CustomerAiHealthService` | AI |
| `CustomerPushService`, `CustomerNotificationService` | Notification |
| `CustomerAppAuthService` | Identity |
| `CustomerCatalogService` | Master Data / Medication |
| `CustomerChatService` | Customer Communication |
| `CustomerEngagementAnalyticsService` | Reporting |

**Hệ quả EA:** Không thể giao một đội “Care Domain” độc lập; AI và Sales rules dễ bị nhét thêm vào channel.  
**Hướng sửa (không rewrite UI):** giữ `CustomerApp` = **BFF/adapter**; logic dần gọi contract Care/Sales/Customer.

### 8.3 Business Rules đang “vô danh” (mẫu BR-ID đề xuất)

Rules đã chạy trong code nhưng **không có catalog / Rule Engine**:

| BR-ID đề xuất | Rule | Nơi hiện tại |
|---------------|------|--------------|
| `BR-INV-001` | Xuất kho theo FEFO (expiry ASC) | `BatchResolver.AllocateFromBatches` |
| `BR-INV-002` | Không đủ tồn → fail allocation | cùng file, message “Không đủ tồn kho theo FEFO” |
| `BR-INV-003` | `stock_movements` là nguồn truth | convention docs + repositories |
| `BR-PRC-001` | Chiết khấu % / số tiền trên dòng & đơn | `SalesPricing` |
| `BR-PRC-002` | Staff max discount %; admin unlimited | `SalesDiscountPolicy.FromPermissions` |
| `BR-PRC-003` | Không quyền chiết khấu → reject | `SalesPricing.ValidateDiscounts` |
| `BR-LOY-001` | Max redeem percent voucher/loyalty | migrations + voucher services |
| `BR-CARE-001` | Adherence response ∈ taken/skipped/snoozed | `medication_adherence_events` CHECK |
| `BR-CARE-002` | Repurchase từ supply end date đơn | `CustomerRepurchase*` |
| `BR-AI-001` | Câu hỏi <3 ký tự reject; max 500 | `CustomerAiHealthService` |
| `BR-AI-002` | Drug guidance theo profile hardcode | `CustomerDrugKnowledge` |
| `BR-ID-001` | Mọi bảng nghiệp vụ có `tenant_id` | schema + accessors |
| `BR-SEC-001` | API staff/customer theo permission policy | `Api/Authorization/*` |

Pass 2 kết luận: **Rules đã có hành vi**, thiếu **định danh + ownership Domain + Policy nguồn**.

### 8.4 Đề xuất interface Engine (formalize trong monolith — không tách MS)

```
IInventoryEngine   ← wrap IBatchResolver + movement invariants (BR-INV-*)
IPricingEngine     ← wrap SalesPricing + ProcurementPricing + SalesDiscountPolicy (BR-PRC-*)
IPermissionEngine  ← wrap permission checks + SalesDiscountPolicy.FromPermissions
IAuditEngine       ← wrap IAuditLogService; bắt buộc trên write path domain
```

AI path mục tiêu (P1):

```
IAiOrchestrator
  → IKnowledgeQuery (Knowledge Domain)
  → IRuleEvaluator (BR-AI-*, BR-CARE-*)
  → ICareContext / IMedicationContext  (contracts, không SQL trong AI)
```

### 8.5 Checklist Founder (pass tiếp theo — governance, không code)

- [ ] Chốt NSF tối thiểu 6 standard: Customer, Inventory, Care, Medication, Data, AI
- [ ] Gán Owner cho 15 Domain (có thể 1 người nhiều domain lúc founding)
- [ ] Duyệt backlog P0–P1 trong §7
- [ ] Mỗi PR feature mới: ghi Domain + Capability + BR-ID (hoặc “new BR”) trong mô tả
- [ ] Không approve LLM production cho đến khi AI Policy gate (§7 P1)

---

## 9. Tham chiếu code chính

| Chủ đề | Path |
|--------|------|
| DI / service registration | `src/KitPlatform.Infrastructure/DependencyInjection.cs` |
| FEFO | `src/KitPlatform.Infrastructure/Inventory/BatchResolver.cs` |
| Pricing bán | `src/KitPlatform.Application/Sales/SalesPricing.cs` |
| Pricing nhập | `src/KitPlatform.Application/Procurement/ProcurementPricing.cs` |
| AI Copilot | `src/KitPlatform.Infrastructure/CustomerApp/CustomerAiHealthService.cs` |
| Drug hardcode | `src/KitPlatform.Infrastructure/CustomerApp/CustomerDrugKnowledge.cs` |
| Outbox | `src/KitPlatform.Infrastructure/Integration/IntegrationOutboxWorker.cs` |
| Module catalog (UI) | `docs/novixa/02-product/module-catalog-v1.md` |
| Solution arch V1 | `docs/novixa/03-solution/solution-architecture-v1.md` |

---

## 10. Lịch sử

| Version | Ngày | Ghi chú |
|---------|------|---------|
| 1.0 | 2026-07-05 | Gap analysis đầu tiên từ code KitPlatform vs EA 8-layer + 15 domains + Core Engines |
| 1.1 | 2026-07-05 | Pass 2: domain scorecard, CustomerApp coupling, BR-ID mẫu, engine interface đề xuất |
| 1.2 | 2026-07-05 | Pass 3: NSF/Policies/Domain map + Core Engines formal (wrap, pilot-safe) — NVX-SOL-07 |
| 1.3 | 2026-07-05 | G2b: AuditEngine call-sites + pilot smoke checklist NVX-CS-08 |

*Owner: Engineering + Product · Review: Founder mỗi quý hoặc khi thêm domain lớn*
