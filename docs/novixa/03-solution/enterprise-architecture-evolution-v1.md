# Novixa — Enterprise Architecture Evolution (không đập đi xây lại)

**Mã:** NVX-SOL-07 · **Tier:** T2/T3 · **Trạng thái:** Active · **Version:** 1.0  
**Phạm vi:** Nâng cấp EA trên KitPlatform modular monolith · **Pilot:** 3 nhà thuốc

---

## 1. Nguyên tắc bất biến (pilot-safe)

1. **Không breaking API** đang dùng tại nhà thuốc (Admin, POS, Customer App, Staff).
2. **Không đổi schema** trừ khi additive (cột/bảng mới, nullable, default an toàn).
3. **Logic cũ giữ nguyên hành vi**; Engine / Orchestrator **bọc** (wrap), không thay thuật toán trong cùng PR.
4. **CustomerApp** = kênh (adapter). Domain logic dần về Care / Customer / Sales contracts.
5. **Microservices / BFF / Kafka** chỉ sau khi Domain boundary + Engine ổn định.
6. Mọi feature mới: ghi **Domain + Capability + BR-ID** (xem `BusinessRuleIds`).

Gap matrix: [enterprise-architecture-gap-matrix-v1.md](./enterprise-architecture-gap-matrix-v1.md) (NVX-SOL-06).  
**KIT Platform vs Novixa Pack:** [platform-kernel-and-solution-packs-v1.md](./platform-kernel-and-solution-packs-v1.md) (KIT-PLT-01).

---

## 2. Lớp đã bổ sung (G0–G2)

| Lớp EA | Artefact | Path |
|--------|----------|------|
| Standards (NSF) | 6 standard tối thiểu | `docs/novixa/standards/` |
| Policies | Policy catalog | `docs/novixa/policies/` |
| Domains | Domain map 15 | `docs/novixa/domains/domain-map-v1.md` |
| Rules | BR-ID catalog (code) | `src/KitPlatform.Application/Core/BusinessRuleIds.cs` |
| Engines | Inventory, Pricing, Permission, Audit | `Application/Core/Engines/*` + `Infrastructure/Core/Engines/*` |
| Care contracts | `IAiCareContextProvider`, `ICareProductLookup` | `Application/Care/*` + `Infrastructure/Care/*` |
| Knowledge | `IDrugKnowledgeQuery`, `DrugKnowledgeRules` | `Application/Knowledge/*` |
| AI path | `IAiOrchestrator` → copilot (no SQL in copilot) | `Infrastructure/Core/Engines/AiOrchestrator.cs` |

**Đăng ký DI:** additive — service cũ (`IBatchResolver`, `ICustomerAiHealthService`, …) **vẫn resolve được**.

---

## 3. Lộ trình tiếp (không xung đột pilot)

| Phase | Việc | Rủi ro pilot |
|-------|------|--------------|
| **G1** (done) | Engine interfaces + NSF/Policy docs | Không |
| **G2** (done) | Migrate Sales/Procurement → Engines; Care/Knowledge; AI no SQL in copilot | Không |
| **G2b** (done) | Migrate write-path audit → `IAuditEngine` (Sales, Inventory, Procurement) | Không |
| **G3** | CustomerApp channel → call Care/Sales domain services only | Trung bình — PR nhỏ |
| **G4** | Knowledge table + AI không SQL trực tiếp | Thấp nếu feature-flag |
| **G5** | Event bus nội bộ / BFF khi cần scale | Chỉ khi đo được nhu cầu |

---

## 4. Quy tắc PR kiến trúc

- [ ] Không xóa `IBatchResolver` / `SalesPricing` / API routes đang live.
- [ ] Engine mới phải **delegate** sang implementation đã chứng minh tại pilot.
- [ ] Migration SQL: chỉ additive hoặc backfill an toàn.
- [ ] AI/LLM production: cần AI Policy gate (xem NSF-AI + Policy-AI).
