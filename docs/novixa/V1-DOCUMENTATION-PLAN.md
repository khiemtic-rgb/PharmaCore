# Novixa — Kế hoạch bộ tài liệu V1 (2026–2027)

**Mã kế hoạch:** NVX-PLAN-DOC-V1  
**Tier:** T3 Internal  
**Trạng thái:** Approved (khung) · Draft (nội dung chi tiết từng file)

**Entry point (Launch 10 DOC + Operations):** [DOC-MASTER-INDEX.md](./DOC-MASTER-INDEX.md)

---

## 1. Mục đích & nguyên tắc

### 1.1 Mục đích

Xây dựng **bộ tài liệu vận hành doanh nghiệp** phục vụ:

1. **Ra mắt thị trường Việt Nam** (founding customers, demo, case study)
2. **Triển khai nhất quán** (onboarding, go-live, support)
3. **Bán hàng có kiểm soát** (ICP, pricing, objection, không over-promise)
4. **Mở rộng team** (dev, CS, sales cùng một “source of truth”)

### 1.2 Nguyên tắc (chuẩn công ty công nghệ toàn cầu)

| Nguyên tắc | Ý nghĩa |
|------------|---------|
| **Single source of truth** | Một chủ đề = một file canonical; tránh copy lệch trên slide/email |
| **Tier rõ ràng** | Public / Customer / Partner / Internal — không lẫn pricing nội bộ lên web |
| **Version & owner** | Mỗi doc có owner, ngày review, version v1/v2 |
| **Truth in labeling** | Ghi rõ *Đã có* / *Pilot* / *Roadmap* — không marketing vượt product |
| **Operational first** | Checklist, runbook, playbook trước brochure đẹp |
| **Locale V1** | Tiếng Việt primary; EN skeleton khi cần đối tác |

---

## 2. Phạm vi V1 (2026–2027)

### 2.1 Trong phạm vi

- Nhà thuốc GPP tại Việt Nam: độc lập & chuỗi **2–10 cửa**
- Gói vận hành **Phase 1** (ERP + POS + kho lô + mua hàng + CRM + app khách + báo cáo Wave 1)
- Mô hình triển khai: **Pilot isolated** → **SaaS multi-tenant** (Model B)
- Founding Early Access + onboarding có case study

### 2.2 Ngoài phạm vi V1 (ghi roadmap, không cam kết)

- Module thuế/kế toán chuyên sâu (Phase 2)
- HĐĐT tích hợp đầy đủ
- Danh mục thuốc quốc gia QĐ 522 (production API)
- Super Admin UI doanh nghiệp
- Thị trường ngoài Việt Nam
- EN marketing site publish

---

## 3. Ma trận tài liệu V1

### 3.1 Nhóm 01 — Company & Strategy

| ID | Tài liệu | Tier | Trạng thái | Owner |
|----|----------|------|------------|-------|
| NVX-CMP-01 | [vision-and-strategy-v1.md](./01-company/vision-and-strategy-v1.md) | T2/T3 | Draft | CEO/Product |
| NVX-CMP-02 | brand-voice-and-messaging-v1.md | T0/T1 | Planned | Marketing |
| NVX-CMP-03 | organization-roles-raci-v1.md | T3 | Planned | Ops |
| NVX-CMP-04 | okrs-2026-v1.md | T3 | Planned | Leadership |

### 3.2 Nhóm 02 — Product

| ID | Tài liệu | Tier | Trạng thái | Owner |
|----|----------|------|------------|-------|
| NVX-PRD-01 | [product-overview-v1.md](./02-product/product-overview-v1.md) | T1/T2 | Draft | Product |
| NVX-PRD-02 | [module-catalog-v1.md](./02-product/module-catalog-v1.md) | T1/T2 | Draft | Product |
| NVX-PRD-03 | product-roadmap-2026-2027-v1.md | T1 | Planned | Product |
| NVX-PRD-04 | feature-matrix-phase1-vs-phase2-v1.md | T2 | Planned | Product (→ PHASE_SCOPE.md) |
| NVX-PRD-05 | reports-catalog-v1.md | T1 | Planned | Product (→ REPORTS_WAVE1.md) |
| NVX-PRD-06 | customer-app-capabilities-v1.md | T1 | Planned | Product |
| NVX-PRD-07 | staff-pos-mobile-v1.md | T2 | Planned | Product |

### 3.3 Nhóm 03 — Solution & Architecture

| ID | Tài liệu | Tier | Trạng thái | Owner |
|----|----------|------|------------|-------|
| NVX-SOL-01 | [solution-architecture-v1.md](./03-solution/solution-architecture-v1.md) | T2/T3 | Draft | Engineering |
| NVX-SOL-02 | multi-tenant-model-v1.md | T3 | Planned | Engineering |
| NVX-SOL-03 | integration-catalog-v1.md | T2 | Planned | Engineering |
| NVX-SOL-04 | data-model-overview-v1.md | T3 | Planned | Engineering |
| NVX-SOL-05 | security-architecture-v1.md | T2/T3 | Planned | Engineering |
| NVX-SOL-06 | [enterprise-architecture-gap-matrix-v1.md](./03-solution/enterprise-architecture-gap-matrix-v1.md) | T2/T3 | Draft | Engineering + Product |
| NVX-SOL-07 | [enterprise-architecture-evolution-v1.md](./03-solution/enterprise-architecture-evolution-v1.md) | T2/T3 | Active | Engineering + Product |
| NVX-DOM-01 | [domain-map-v1.md](./domains/domain-map-v1.md) | T2 | Draft | Product |
| NSF-* | [standards/](./standards/) | T2 | Draft | Product |
| POL-* | [policies/](./policies/) | T2 | Draft | Product |

### 3.4 Nhóm 04 — GTM (Go-to-Market)

| ID | Tài liệu | Tier | Trạng thái | Owner |
|----|----------|------|------------|-------|
| NVX-GTM-01 | [icp-positioning-pricing-v1.md](./04-gtm/icp-positioning-pricing-v1.md) | T2/T3 | Draft | GTM |
| NVX-GTM-02 | [sales-playbook-v1.md](./04-gtm/sales-playbook-v1.md) | T3 | Outline (Draft) | Sales |
| NVX-GTM-03 | [sales-deck-v1.md](./launch/DOC-008/sales-deck-v1.md) | T2 | Draft | Sales |
| NVX-GTM-04 | lead-sequence-v1.md | T3 | Planned | Sales |
| NVX-GTM-05 | objection-handling-v1.md | T3 | Planned | Sales |
| NVX-GTM-06 | marketing-plan-2026-v1.md | T3 | Planned | Marketing |
| NVX-GTM-07 | content-calendar-v1.md | T3 | Planned | Marketing |
| NVX-GTM-08 | [founding-program-terms-v1.md](./04-gtm/founding-program-terms-v1.md) | T2 | Draft | Legal/GTM |

### 3.5 Nhóm 05 — Operations

| ID | Tài liệu | Tier | Trạng thái | Owner |
|----|----------|------|------------|-------|
| NVX-OPS-01 | [deployment-model-v1.md](./05-operations/deployment-model-v1.md) | T2/T3 | Draft | DevOps |
| NVX-OPS-02 | production-runbook-v1.md | T3 | Planned | DevOps |
| NVX-OPS-03 | backup-restore-v1.md | T3 | Planned | DevOps |
| NVX-OPS-04 | incident-response-v1.md | T3 | Planned | Support |
| NVX-OPS-05 | sla-support-tiers-v1.md | T2 | Planned | Support |
| NVX-OPS-06 | monitoring-health-v1.md | T3 | Planned | DevOps |

### 3.6 Nhóm 06 — Compliance & Trust

| ID | Tài liệu | Tier | Trạng thái | Owner |
|----|----------|------|------------|-------|
| NVX-CPL-01 | [gpp-operational-context-v1.md](./06-compliance/gpp-operational-context-v1.md) | T1/T2 | Draft | Compliance |
| NVX-CPL-02 | data-privacy-consent-v1.md | T1/T2 | Planned | Legal |
| NVX-CPL-03 | audit-log-retention-v1.md | T2 | Planned | Engineering |
| NVX-CPL-04 | disclaimer-not-medical-advice-v1.md | T0 | Planned | Legal |

### 3.7 Nhóm 07 — Customer Success

| ID | Tài liệu | Tier | Trạng thái | Owner |
|----|----------|------|------------|-------|
| NVX-CS-01 | [onboarding-playbook-v1.md](./07-customer/onboarding-playbook-v1.md) | T2 | Outline (Draft) | CS |
| NVX-CS-02 | [go-live-checklist-customer-v1.md](./07-customer/go-live-checklist-customer-v1.md) | T2 | Draft | CS (→ pilot-go-live-checklist) |
| NVX-CS-03 | training-curriculum-v1.md | T2 | Planned | CS |
| NVX-CS-04 | admin-user-guide-v1/ | T1 | Planned | CS/Product |
| NVX-CS-05 | pos-quick-start-v1.md | T1 | Planned | CS |
| NVX-CS-06 | customer-app-guide-v1.md | T1 | Planned | CS |
| NVX-CS-07 | migration-playbook-v1.md | T2 | Planned | CS (→ import/xuan-hoa) |
| NVX-CS-08 | [pilot-smoke-test-checklist-v1.md](./07-customer/pilot-smoke-test-checklist-v1.md) | T2 | Draft | CS + Engineering |

### 3.8 Nhóm 08 — Internal Governance

| ID | Tài liệu | Tier | Trạng thái | Owner |
|----|----------|------|------------|-------|
| NVX-INT-01 | [document-governance-v1.md](./08-internal/document-governance-v1.md) | T3 | Draft | Ops |
| NVX-INT-02 | release-notes-process-v1.md | T3 | Planned | Product |
| NVX-INT-03 | demo-environment-v1.md | T3 | Planned | Engineering |

---

## 4. Lộ trình hoàn thiện (2026)

| Giai đoạn | Thời gian | Deliverable | Tiêu chí xong |
|-----------|----------|-------------|---------------|
| **Wave A — Khung & truth** | Q3/2026 | NVX-CMP-01, PRD-01/02, SOL-01, GTM-01/02, OPS-01, CPL-01, CS-01, INT-01 | Sales/demo không mâu thuẫn product · **Draft hoàn thành 2026-07-04** |
| **Wave B — Bán & triển khai** | Q3–Q4/2026 | GTM-02/03/08, CS-01/02, OPS-02, training outline | Ký founding + go-live 1 pilot |
| **Wave C — Customer-facing** | Q4/2026–Q1/2027 | CS-04/05/06, CPL-02, SLA draft | Khách tự tra cứu 80% câu hỏi vận hành |
| **Wave D — Scale** | 2027 | SOL-02/04/05, multi-tenant SaaS pack | ≥3 tenant trên Model B |

---

## 5. Mối quan hệ với kênh khác

| Kênh | Vai trò | Không thay thế |
|------|---------|----------------|
| **novixa.vn** | T0 awareness, founding hook | User guide chi tiết |
| **Admin in-app** | T1 task help (tương lai) | Runbook kỹ thuật |
| **Demo checklists** | UAT nội bộ | Architecture doc |
| **Handoff `.cursor/`** | Dev session memory | Customer-facing doc |

---

## 6. KPI bộ tài liệu (vận hành)

| KPI | Mục tiêu V1 |
|-----|-------------|
| Thời gian onboard founding customer | ≤ 4 tuần từ ký → go-live POS |
| Sales cycle demo → ký | Đo baseline Q4/2026 |
| Ticket “hỏi lại tính năng có hay không” | Giảm nhờ module catalog public nội bộ |
| Doc stale (>90 ngày không review) | 0 file critical (PRD, OPS, GTM-01) |

---

## 7. Bước tiếp theo (đề xuất)

1. **Approve** khung này với leadership  
2. **Wave A:** Hoàn thiện 6 file Draft → Review → Approved  
3. **Tách** nội dung marketing cũ (nếu có ngoài repo) vào `04-gtm/`  
4. **Publish T1** subset lên Notion/Google Drive khách hàng (repo giữ T2/T3)  
5. **Gắn** release notes mỗi sprint vào NVX-INT-02  

---

*Owner: Product · Review cycle: hàng quý · Version: 1.0*
