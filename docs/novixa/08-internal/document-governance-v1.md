# Novixa — Document Governance V1

**Mã:** NVX-INT-01 · **Tier:** T3 · **Trạng thái:** Draft · **Version:** 1.0

---

## 1. Mục đích

Đảm bảo bộ tài liệu Novixa **nhất quán, cập nhật, phân quyền đúng tier** — phục vụ vận hành doanh nghiệp, không trở thành tài liệu “treo” lệch product.

---

## 2. Phạm vi

Áp dụng cho mọi file trong `docs/novixa/` và tài liệu canonical liên kết (checklists admin, handoff dev).

**Không thay thế:** commit message, code comments, in-app help (tương lai).

---

## 3. Ownership

| Nhóm | Owner mặc định | Reviewer |
|------|----------------|----------|
| 01-company | Leadership / Product | CEO |
| 02-product | Product | Engineering lead |
| 03-solution | Engineering | DevOps |
| 04-gtm | GTM / Sales | Leadership |
| 05-operations | DevOps | Engineering |
| 06-compliance | Compliance / Legal | Leadership |
| 07-customer | Customer Success | Product |
| 08-internal | Ops | Leadership |

Mỗi file ghi **Owner** ở footer hoặc header metadata.

---

## 4. Vòng đời tài liệu

```
Draft → Review → Approved → Published (subset T0/T1)
                ↓
            Deprecated (link tới bản mới)
```

| Trạng thái | Ý nghĩa |
|------------|---------|
| **Draft** | Đang viết, có thể sai |
| **Review** | Chờ peer review |
| **Approved** | Dùng nội bộ chính thức |
| **Published** | Được phép đưa ra khách / web |
| **Deprecated** | Không dùng, giữ lịch sử |

---

## 5. Versioning

- **Major (`v1`, `v2`):** thay đổi scope, pricing, kiến trúc lớn
- **Minor (trong file):** ghi `Version: 1.1` + changelog cuối file
- **Filename:** giữ `-v1` cho major; không rename liên tục

---

## 6. Tier & phân phối

| Tier | Lưu trữ canonical | Copy ra ngoài |
|------|-------------------|---------------|
| T0 Public | Repo + novixa.vn | Web publish |
| T1 Customer | Repo + Drive/Notion khách | Sau onboarding |
| T2 Partner | Repo | NDA partners |
| T3 Internal | Repo only | Không email nguyên văn |

**Rule:** Không paste T3 (pricing nội bộ, kiến trúc chi tiết) vào kênh public.

---

## 7. Single source of truth

| Chủ đề | File canonical |
|--------|----------------|
| Feature có/không | `02-product/module-catalog-v1.md` + `PHASE_SCOPE.md` |
| Pricing founding | `04-gtm/icp-positioning-pricing-v1.md` + `vi.json` |
| Go-live kỹ thuật | `pilot-go-live-checklist.md` |
| Deploy | `05-operations/deployment-model-v1.md` + `novixa-deploy.md` |
| Báo cáo | `REPORTS_WAVE1.md` |

Khi cập nhật product → **cập nhật canonical trước**, rồi slide/web.

---

## 8. Review cycle

| Loại doc | Chu kỳ review |
|----------|---------------|
| PRD, module catalog | Mỗi release minor |
| GTM-01 pricing | Khi đổi offer / quý |
| OPS deploy | Mỗi thay đổi infra |
| Compliance GPP | Hàng năm |
| Plan tổng | `V1-DOCUMENTATION-PLAN.md` — hàng quý |

**KPI:** 0 file critical stale > 90 ngày (PRD-01/02, GTM-01, OPS-01).

---

## 9. Quy trình thêm/sửa doc

1. Tạo/sửa trong `docs/novixa/` theo [template](../templates/doc-template-v1.md)
2. PR nội bộ hoặc review async với Owner
3. Cập nhật `V1-DOCUMENTATION-PLAN.md` matrix (trạng thái)
4. Link từ `docs/novixa/README.md` nếu doc mới quan trọng
5. Publish T0/T1 subset nếu cần

---

## 10. Liên kết với release

Mỗi sprint/release product:

- Cập nhật module catalog nếu có feature mới
- Ghi release note (NVX-INT-02 Planned)
- Flag Pilot → Approved trong catalog

---

## 11. Template & naming

- Template: [templates/doc-template-v1.md](../templates/doc-template-v1.md)
- ID: `NVX-{NHÓM}-{NN}` theo plan

---

*Owner: Ops · Approved khung: 2026-Q3*
