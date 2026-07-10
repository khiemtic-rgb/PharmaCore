# Novixa Customer App — Roadmap P12–P18

**Mã:** NVX-PRD-09 · **Tier:** T1/T2 · **Trạng thái:** Draft · **Version:** 1.2  
**Ngày:** 2026-07-09 · **Owner:** Product  
**Baseline:** Customer app **P11a** (pilot production) — PWA `client/customer-app`, API `/api/customer-app/*`

**Liên quan:**
- [novixa-target-requirements-and-completion-sequence-v1.md](../02-product/novixa-target-requirements-and-completion-sequence-v1.md) (NVX-PRD-08)
- [nsf-customer-v1.md](../standards/nsf-customer-v1.md)
- [go-live-checklist-customer-v1.md](./go-live-checklist-customer-v1.md) (NVX-CS-02)
- [pilot-smoke-test-checklist-v1.md](./pilot-smoke-test-checklist-v1.md) (NVX-CS-08)
- **Đang làm:** [customer-app-phase-gates-v1.md](./customer-app-phase-gates-v1.md) · `.cursor/handoff/customer-app-p11b.md`
- **Cam kết sales:** [customer-app-founding-commitment-v1.md](./customer-app-founding-commitment-v1.md)
- **Backlog sau P11b:** [customer-app-backlog-p12-p18.md](./customer-app-backlog-p12-p18.md)

> Roadmap được sắp xếp theo **chu trình giá trị**, **phụ thuộc kỹ thuật** và **cổng chất lượng** — không theo thứ tự số phase hay áp lực đối thủ đơn thuần.

**Legend:** ✅ Đã có · ⚠️ Một phần · ❌ Chưa có · 🎯 Mục tiêu phase · 🔒 Bắt buộc trước · ⛔ Không được nhảy qua

---

## 1. Hiện trạng (sau P11a) — Mức L0

| Lớp năng lực | Mức | Ghi chú |
|---|---|---|
| Pharmacy Connection | ~75% | Draft O2O, reservation, chat, hub, branding |
| Medication Management | ~60% | Nhắc, adherence, repurchase, active meds, push |
| Customer Engagement | ~55% | Loyalty, voucher, consent, notifications |
| Personal Health Management | ~35% | Health wallet, vitals, family CRUD |
| AI Health Companion | ~20% | Rule-based copilot |
| Connected Healthcare Platform | ~30% | ERP/POS; chưa thiết bị / assessment |

**Điểm mạnh giữ vững:** white-label · O2O draft order · công nợ KH · CDP consent · adherence loop.

**Ước tính:** ~45–50% PRD Customer App — tương đương **Maturity L0** (xem §2.2).

---

## 2. Phương pháp lập lộ trình

### 2.1 Chu trình giá trị (thứ tự nghiệp vụ bắt buộc)

Mọi phase phải **bám chu trình** đã định trong PRD — không xây tính năng “lơ lửng” ngoài vòng này:

```
[1] Kết nối & tin cậy  →  [2] Dữ liệu sức khỏe  →  [3] Điều trị hàng ngày
        →  [4] Giao dịch  →  [5] Trí tuệ hỗ trợ  →  [6] Gắn kết dài hạn  →  [7] Nền tảng mở
```

| Bước chu trình | Ý nghĩa | Phase map | Quy tắc |
|---|---|---|---|
| **1. Kết nối & tin cậy** | KH đăng nhập, NT nhận diện, push/OTP ổn | **P11b** | ⛔ Mọi thứ khác phụ thuộc bước này |
| **2. Dữ liệu SK** | Hồ sơ, gia đình, chỉ số có ý nghĩa | **P15** (mở rộng P5) | Trước analytics & AI sâu |
| **3. Điều trị hàng ngày** | Nhắc thuốc, adherence, tái khám | *P11a đã có* | Không regression khi thêm commerce |
| **4. Giao dịch** | Đặt hàng, đơn thuốc, thanh toán | **P12 → P13** | Upload (P12) trước cấu trúc hóa (P13) |
| **5. Trí tuệ hỗ trợ** | AI giải thích, tương tác thuốc | **P14** | 🔒 Chỉ sau e-Rx có cấu trúc (P13) |
| **6. Gắn kết dài hạn** | CSAT, knowledge, campaign | **P16** | 🔒 Sau có đơn hàng để đo CSAT (P12) |
| **7. Nền tảng mở** | Native, community, thiết bị | **P17 → P18** | Cuối — khi core ổn định |

---

### 2.2 Mô hình trưởng thành (Maturity L0–L5)

Dùng để **đo tiến độ** và **quyết định có mở phase tiếp không** — không dùng % tùy ý.

| Level | Tên | Điều kiện đạt | Phase hoàn thành |
|---|---|---|---|
| **L0** | Pilot viable | Demo + 1 NT dev; O2O + nhắc thuốc chạy | P11a ✅ |
| **L1** | Production stable | OTP thật, push production, UAT 3 NT, monitoring | **P11b** |
| **L2** | Continuous care | Caregiver đa TK + analytics KH + adherence đo được | **P15** |
| **L3** | Transaction complete | Giỏ hàng + checkout + e-Rx + timeline điều trị | **P12 + P13** |
| **L4** | Intelligent companion | LLM + interaction check + proactive nhắc (guardrailed) | **P14** |
| **L5** | Engagement platform | CSAT, knowledge, campaign, native, community | **P16–P18** |

**Quy tắc vàng:** Không marketing **Level N** khi chưa pass gate **Level N−1**.

---

### 2.3 Ma trận phụ thuộc kỹ thuật

Phase **B** chỉ bắt đầu khi **A** đạt gate (§2.5).

```
                    P11b 🔒
                      │
          ┌───────────┴───────────┐
          ▼                       ▼
        P15                     P12
    (retention)              (commerce)
          │                       │
          │                       ▼
          │                     P13
          │                  (e-Rx + OCR)
          │                       │
          └───────────┬───────────┘
                      ▼
                    P14
                     (AI)
                      │
                      ▼
                    P16
                (engagement)
                      │
              ┌───────┴───────┐
              ▼               ▼
            P17             P18
          (native)       (community)
```

| Phase | Predecessor bắt buộc | Lý do khoa học |
|---|---|---|
| P11b | P11a | Infra trước feature |
| P15 | P11b | Caregiver cần OTP/push ổn; analytics cần data pilot thật |
| P12 | P11b | Checkout cần auth + notification ổn định |
| P13 | P12-S3 | OCR/upload pipeline; không OCR trước khi có luồng ảnh đơn |
| P14 | P13-S1 | AI cần e-Rx structured — rule-based không đủ context |
| P16 | P12-S2 | CSAT gắn đơn hoàn tất; campaign cần catalog commerce |
| P17 | P12 + P16-S4 | Payment gateway + redeem điểm cần checkout + loyalty UI |
| P18 | P16 | Community moderation cần CSAT/ticket pattern |

**Phụ thuộc mềm (nên có, có thể lệch 1 sprint):**

| Phase | Nên sau | Lợi ích |
|---|---|---|
| P12 | P15-S2 | Caregiver đặt hàng thay — cần cart |
| P14 | P15-S3 | AI proactive dùng analytics adherence |
| P16-S4 | P17-S3 | Redeem điểm tại checkout — gateway P17 |

---

### 2.4 Công thức ưu tiên phase (khi xung đột tài nguyên)

Khi **P15 vs P12** tranh cùng sprint, chấm điểm:

```
Score(phase) = (BusinessImpact × 0.35) + (DependencyUnlock × 0.30)
             + (RiskReduction × 0.20) + (PilotReadiness × 0.15)
```

Thang 1–5 cho từng tiêu chí:

| Phase | BusinessImpact | DependencyUnlock | RiskReduction | PilotReadiness | **Score** |
|---|---|---|---|---|---|
| P11b | 3 | 5 | 5 | 5 | **4.45** |
| P15 | 4 | 4 | 4 | 5 | **4.25** |
| P12 | 5 | 4 | 3 | 3 | **3.95** |
| P13 | 4 | 5 | 4 | 2 | **3.95** |
| P14 | 4 | 3 | 2 | 2 | **3.05** |
| P16 | 3 | 2 | 2 | 2 | **2.35** |
| P17 | 3 | 2 | 2 | 1 | **2.15** |
| P18 | 2 | 1 | 1 | 1 | **1.35** |

**Kết luận từ công thức:** `P11b → P15 → P12 → P13 → P14 → P16 → P17 → P18` — trùng **Track B**.

Track A (P12 trước P15) chỉ hợp lệ khi **PilotReadiness ≥ 4** (đã L1) **và** BusinessImpact commerce được Sales ký xác nhận.

---

### 2.5 Quality gates (cổng giữa các phase)

⛔ **Không mở phase tiếp** nếu gate trước chưa pass.

#### Gate G0 → G1 (vào P11b)

- [ ] P11a checklist dev hoàn tất
- [ ] Migration ≤064 chạy trên staging

#### Gate G1 → G2 (P11b Done → mở P15 & P12)

| # | Tiêu chí | Ngưỡng |
|---|---|---|
| G1.1 | OTP SMS production | 3 NT login thật liên tiếp 7 ngày |
| G1.2 | Push delivery rate | ≥90% subscription hoạt động |
| G1.3 | API error rate customer-app | <1% 5xx / 24h |
| G1.4 | UAT P11a | 6/6 kịch bản pass / NT |

#### Gate G2 → G3 (P15 Done → ưu tiên P12 full)

| # | Tiêu chí | Ngưỡng |
|---|---|---|
| G2.1 | Caregiver invite | ≥1 luồng mời + accept trên pilot |
| G2.2 | Analytics `/insights` | Load <3s; data khớp POS |
| G2.3 | Maturity | Đạt **L2** |

#### Gate G3 → G4 (P12+P13 Done → mở P14)

| # | Tiêu chí | Ngưỡng |
|---|---|---|
| G3.1 | Checkout E2E | 10 đơn OTC pilot không lỗi |
| G3.2 | Rx upload → duyệt → đơn | 5 case DS approve |
| G3.3 | e-Rx structured | Import từ POS + OCR review |
| G3.4 | Maturity | Đạt **L3** |

#### Gate G4 → G5 (P14 Done → mở P16)

| # | Tiêu chí | Ngưỡng |
|---|---|---|
| G4.1 | AI disclaimer + escalate | 100% response có disclaimer |
| G4.2 | Interaction check | Test suite 20 cặp hoạt chất |
| G4.3 | Maturity | Đạt **L4** |

#### Gate G5 (P16–P18)

- P16 Done: CSAT response rate ≥15% đơn hoàn tất (pilot)
- P17 Done: Store review pass; push native parity
- P18 Done: POC assessment + 1 thiết bị BLE demo

---

## 3. Trình tự chuẩn (Canonical Sequence)

**Đây là thứ tự duy nhất Product cam kết** khi không có exception được phê duyệt:

```
P11b ──→ P15 ──→ P12 ──→ P13 ──→ P14 ──→ P16 ──→ P17 ──→ P18
  L1       L2      └──── L3 ────┘   L4       L5a      L5b      L5c
```

### 3.1 Tại sao P15 trước P12 (logic, không phải ý thích)

| # | Lý do | Hệ quả nếu làm ngược (P12 trước) |
|---|---|---|
| 1 | **Pilot cần retention trước GMV** — NT nhỏ chưa có traffic app | Giỏ hàng trống, waste sprint |
| 2 | **Caregiver là multiplier adherence** — đúng ICP gia đình NT địa phương | Mất stickiness khi chỉ có commerce |
| 3 | **Analytics P15 tạo baseline** — đo uplift sau P12 | Không chứng minh ROI commerce |
| 4 | **Score ưu tiên** (§2.4): P15 > P12 khi PilotReadiness cao | — |
| 5 | P12 **không bị block** bởi P15 — chỉ reorder; dependency chỉ cần P11b | P12 vẫn có thể song song P15-S3/S4 nếu 2 dev |

### 3.2 Tại sao P13 sau P12 (không gộp)

| Bước | Làm gì | Không làm gì |
|---|---|---|
| P12-S3 | **Capture** — ảnh đơn, workflow duyệt DS | OCR, e-Rx schema |
| P13-S1 | **Structure** — e-Rx từ POS + đơn đã duyệt | Giỏ hàng mới |
| P13-S2 | **Extract** — OCR → draft e-Rx → DS confirm | Auto kê đơn |

Đây là pattern **Capture → Structure → Extract → Automate** — chuẩn health data engineering.

### 3.3 Tại sao P14 sau P13 (không nhảy thẳng LLM)

- AI cần **đối tượng có cấu trúc** (`electronic_prescriptions`, `active_medications` lines)
- Rule-based hiện tại đủ **L1 AI**; LLM là **L4** — nhảy sớm = hallucination trên data mỏng
- Drug interaction cần **hoạt chất map** từ e-Rx, không chỉ tên thương mại

### 3.4 Song song hợp lệ (không phá trình tự)

Khi team ≥2 dev, có thể **overlap** nếu gate trước đã pass:

| Sprint active | Track 1 | Track 2 | Điều kiện |
|---|---|---|---|
| Sau G1 | P15-S1 | P15-S2 prep | Cùng domain family |
| Sau G2 | P12-S1 | P12-S2 prep API | Gate G2 pass |
| Sau G3 | P14-S1 | P16-S1 CSAT design | P13-S1 done |

⛔ **Không song song:** P12 commerce + P14 AI (khác domain, P14 chưa đủ prereq).

---

## 4. Biến thể lộ trình (chỉ khi có exception)

### 4.1 Track B — Chuẩn (mặc định)

```
P11b → P15 → P12 → P13 → P14 → P16 → P17 → P18
```

**Điều kiện:** Pilot 1–3 NT; chưa L1; GTM qua founding NT.

### 4.2 Track A — Commerce ưu tiên (exception)

```
P11b-S1 ──→ P12 → P13 → P14 → P15 → P16 → P17 → P18
```

| Điều kiện kích hoạt (tất cả) | Người phê duyệt |
|---|---|
| Gate G1 pass (L1 đạt) | Product |
| Sales cam kết ≥2 NT yêu cầu giỏ hàng có hợp đồng | Sales lead |
| Chấp nhận trễ L2 ~8 tuần | CS lead |

**Chi phí:** Caregiver trễ 2 phase; analytics không có baseline pre-commerce.

### 4.3 Decision tree

```
Đã pass Gate G1 (P11b)?
├─ NO  → Chỉ làm P11b
└─ YES → Sales có hợp đồng cần e-commerce trong 60 ngày?
         ├─ YES → Track A (P12 ngay)
         └─ NO  → Track B (P15 trước)
```

---

## 5. Timeline & capacity

**Giả định:** 1 sprint = 2 tuần · 2 dev fullstack + 0.5 QA

### 5.1 Track B (chuẩn)

| Phase | Sprints | Maturity | Cộng dồn tuần |
|---|---|---|---|
| P11b | 3 | L0→L1 | 6 |
| P15 | 4 | L1→L2 | 14 |
| P12 | 4 | L2→L3a | 22 |
| P13 | 4 | L3a→L3 | 30 |
| P14 | 4 | L3→L4 | 38 |
| P16 | 4 | L4→L5a | 46 |
| P17 | 5 | L5a→L5b | 56 |
| P18 | 4 | L5b→L5c | 64 |

### 5.2 Sprint calendar (Track B — 2026 H2)

| Sprint | Gate | Focus | Output có thể đo |
|---|---|---|---|
| P11b-S1 | | SMS OTP prod | Login success rate |
| P11b-S2 | | Notification i18n | EN push count |
| P11b-S3 | **G1** | UAT 3 NT | G1 checklist ✅ |
| P15-S1 | | Caregiver invite | Invite accept rate |
| P15-S2 | | Permissions + push | Caregiver confirm dose |
| P15-S3 | | `/insights` | Page load, MAU insights |
| P15-S4 | **G2** | Health PDF | **L2** declared |
| P12-S1 | | Cart + `/shop` | Add-to-cart events |
| P12-S2 | | Checkout | Orders created |
| P12-S3 | | Rx upload | Upload → pending count |
| P12-S4 | **G3a** | COD/QR | Payment confirm rate |
| P13-S1–S4 | **G3** | e-Rx + OCR + timeline | **L3** declared |

*P14 trở đi: chi tiết sprint tại retro P13.*

---

## 6. Chi tiết phase (theo trình tự chuẩn)

> Mỗi phase: **Input** (gate) → **Output** (deliverable) → **Metric** (đo được)

### P11b — Production hardening

| | |
|---|---|
| **Input** | P11a, G0 |
| **Output** | OTP SMS prod; notification i18n server; monitoring |
| **Metric** | G1.1–G1.4 pass |
| **Maturity** | L0 → **L1** |

| Sprint | Deliverable |
|---|---|
| S1 | `HttpCustomerOtpSender` per tenant; rate limit |
| S2 | `tenant_string_translations` cho push/in-app |
| S3 | Dashboard; rollback playbook; UAT sign-off |

---

### P15 — Family 2.0 + Personal analytics

| | |
|---|---|
| **Input** | Gate G1 |
| **Output** | Caregiver đa TK; `/insights`; health PDF |
| **Metric** | G2.1–G2.3; caregiver MAU |
| **Maturity** | L1 → **L2** |

| Sprint | Deliverable |
|---|---|
| S1 | Invite SĐT → `linked_customer_id` |
| S2 | ACL: xem / confirm / order thay |
| S3 | Analytics: chi tiêu 6T, adherence %, top thuốc |
| S4 | PDF báo cáo SK theo thành viên |

---

### P12 — Commerce + Rx upload (capture)

| | |
|---|---|
| **Input** | Gate G2 (khuyến nghị) hoặc G1 (Track A) |
| **Output** | Cart, checkout, upload ảnh đơn, COD/QR |
| **Metric** | G3a: 10 đơn OTC E2E |
| **Maturity** | L2 → **L3a** |

| Sprint | Deliverable |
|---|---|
| S1 | `customer_carts`; `/shop` |
| S2 | Checkout; staff queue |
| S3 | `prescription_uploads`; admin approve/reject |
| S4 | COD + dynamic QR |

**Không làm:** OCR (P13), gateway (P17), redeem điểm (P16).

---

### P13 — Digital Rx (structure + extract)

| | |
|---|---|
| **Input** | P12-S3; Gate G3a |
| **Output** | `electronic_prescriptions`; OCR+review; timeline; share |
| **Metric** | G3.2–G3.3 |
| **Maturity** | L3a → **L3** |

| Sprint | Deliverable |
|---|---|
| S1 | e-Rx schema; import POS/draft |
| S2 | OCR → draft → DS confirm |
| S3 | Auto reminders + repurchase 1-tap |
| S4 | Treatment timeline; share link/PDF |

---

### P14 — AI LLM + interactions

| | |
|---|---|
| **Input** | P13-S1; Gate G3 |
| **Output** | LLM+RAG; interaction engine; proactive alerts |
| **Metric** | G4.1–G4.2 |
| **Maturity** | L3 → **L4** |

| Sprint | Deliverable |
|---|---|
| S1 | `AiOrchestrator` LLM; RAG; BR-AI-001 |
| S2 | Giải thích e-Rx/HDSD; `suggestChat` |
| S3 | Drug interaction; escalate chat |
| S4 | Proactive adherence/repurchase notifications |

---

### P16 — Engagement & Knowledge

| | |
|---|---|
| **Input** | Gate G4 |
| **Output** | CSAT; survey; knowledge CMS; campaign |
| **Metric** | G5 CSAT rate ≥15% |
| **Maturity** | L4 → **L5a** |

| Sprint | Deliverable |
|---|---|
| S1 | CSAT + ticket khiếu nại |
| S2 | Khảo sát in-app |
| S3 | Knowledge Center |
| S4 | Campaign banner; redeem điểm checkout |

---

### P17 — Native + payments deep

| | |
|---|---|
| **Input** | P12 + P16-S4 |
| **Output** | iOS/Android; MoMo/VNPay; widget |
| **Maturity** | L5a → **L5b** |

---

### P18 — Community & ecosystem

| | |
|---|---|
| **Input** | P16 |
| **Output** | Review SP; Q&A; assessment link; BLE POC |
| **Maturity** | L5b → **L5c** |

---

## 7. Map yêu cầu PRD → phase (theo trình tự chuẩn)

| Yêu cầu | L0 (P11a) | Phase đóng gap | Maturity |
|---|---|---|---|
| OTP / push / chat / loyalty | ✅ | P11b (ổn định) | L1 |
| Gia đình + caregiver | ⚠️ | **P15** | L2 |
| Analytics KH | ❌ | **P15** | L2 |
| Giỏ hàng / checkout | ❌ | **P12** | L3a |
| Upload đơn | ❌ | **P12** | L3a |
| e-Rx / OCR / timeline | ❌ | **P13** | L3 |
| AI LLM / tương tác | ❌ | **P14** | L4 |
| CSAT / knowledge / campaign | ❌ | **P16** | L5a |
| Native / payment gateway | ❌ | **P17** | L5b |
| Community / thiết bị | ❌ | **P18** | L5c |
| Hồ sơ bảo hiểm | ❌ | Backlog — không V1 | — |

---

## 8. So sánh đối thủ (sau L3 ≈ P13)

| Module | Novixa L3 | Long Châu | Pharmacity |
|---|---|---|---|
| White-label NT | 🏆 | ❌ | ❌ |
| O2O DS → KH | 🏆 | ⚠️ | ⚠️ |
| E-commerce | ✅ | 🏆 | 🏆 |
| Quét / e-Rx | ⚠️ OCR+review | 🏆 AI quét | 🏆 Upload |
| Gia đình | ✅ P15 | 🏆 VNeID | ⚠️ |
| AI | ⚠️ → L4 | 🏆 LC 247 | ⚠️ |
| Native | ❌ L5b | 🏆 | 🏆 |

---

## 9. Definition of Done (mỗi phase)

1. Gate phase trước pass (§2.5)
2. Migration + `DEMO_PHARMACY` + 1 NT pilot
3. i18n vi/en cho UI mới
4. Smoke checklist cập nhật (NVX-CS-08)
5. Handoff `.cursor/handoff/customer-app-p{N}.md`
6. Không regression: draft order, chat, loyalty, reminders

---

## 10. Rủi ro & guardrails

| Rủi ro | Mitigation |
|---|---|
| Nhảy phase (P12 trước G1) | Gate ⛔; Product sign-off Track A |
| OCR auto-prescribe | DS confirm bắt buộc |
| LLM trước e-Rx | ⛔ P14 blocked until P13-S1 |
| % vision tùy ý | Chỉ dùng Maturity L0–L5 |

---

## 11. Quyết định & vận hành

| Quyết định | Giá trị |
|---|---|
| Trình tự chuẩn | **P11b → P15 → P12 → P13 → P14 → P16 → P17 → P18** |
| Đơn vị đo tiến độ | **Maturity L0–L5**, không % tự ước |
| Cổng bắt buộc | **G1, G2, G3, G4, G5** (§2.5) |
| Exception commerce trước | Track A — cần G1 + Sales sign-off |
| Retro | Cuối mỗi phase: cập nhật score §2.4 nếu context đổi |

### Ritual mỗi sprint

1. **Sprint planning:** Kiểm tra predecessor phase / gate
2. **Mid-sprint:** Metric từ §6 (Output/Metric)
3. **Sprint review:** Demo trên `DEMO_PHARMACY`
4. **Phase end:** Gate checklist §2.5 → mở phase kế

---

**Changelog**

| Version | Ngày | Thay đổi |
|---|---|---|
| 1.0 | 2026-07-09 | Khởi tạo P12–P18; Track A/B |
| 1.1 | 2026-07-09 | Thêm framework §2: chu trình giá trị, maturity L0–L5, dependency DAG, scoring, gates; canonical sequence; decision tree |
| 1.2 | 2026-07-09 | Link gates, backlog P12–P18, founding commitment, handoff P11b |
