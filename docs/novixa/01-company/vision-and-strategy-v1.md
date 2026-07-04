# Novixa — Tầm nhìn & Chiến lược V1

**Mã:** NVX-CMP-01 · **Tier:** T2/T3 · **Trạng thái:** Draft · **Version:** 1.0 · **2026–2027**

---

## 1. Tóm tắt điều hành

**Novixa** (Smart Pharmacy Solutions) xây dựng **nền tảng quản trị nhà thuốc thế hệ mới** cho thị trường Việt Nam — gom quầy bán, tồn kho theo lô, mua hàng, chăm sóc khách hàng và báo cáo trên **một hệ dữ liệu thống nhất**, tuân thủ tinh thần **GPP** và sẵn sàng mở rộng chuỗi.

**Lõi kỹ thuật:** PharmaCore (ERP) · **Kênh tiếp cận:** novixa.vn + demo trực tiếp + founding program.

---

## 2. Vấn đề thị trường

| Pain | Hệ quả |
|------|--------|
| Excel + POS rẻ, không theo lô/HSD | Thất thoát, bán nhầm lô, khó kiểm tra GPP |
| Chuỗi nhỏ thiếu dữ liệu tập trung | Không so sánh chi nhánh, nhập hàng mù |
| CRM tách rời quầy bán | Không biết khách quay lại, loyalty manh mún |
| Báo cáo trễ / thủ công | Quyết định chậm, mù tồn cận date |

---

## 3. Giải pháp Novixa

```
┌─────────────────────────────────────────────────────────┐
│                    NOVIXA PLATFORM                       │
├─────────────┬─────────────┬─────────────┬───────────────┤
│  Admin ERP  │  Staff POS  │ Customer App│  Báo cáo      │
│  (Web)      │  (Mobile)   │  (PWA)      │  real-time    │
├─────────────┴─────────────┴─────────────┴───────────────┤
│              PharmaCore API · Multi-tenant · PostgreSQL    │
└─────────────────────────────────────────────────────────┘
         Marketing: novixa.vn (tách biệt, không DB ERP)
```

**Điểm khác biệt cốt lõi:** FEFO theo lô · dữ liệu thống nhất · O2O (app khách ↔ quầy) · founding có chọn lọc.

---

## 4. Mục tiêu V1 (2026–2027)

| Mục tiêu | Chỉ số / dấu hiệu |
|----------|-------------------|
| **Product-market fit (pilot)** | 3–10 nhà thuốc founding go-live, ≥2 case study |
| **Vận hành ổn định** | POS + kho lô + GRN daily không blocker P0 |
| **GTM có kiểm soát** | Founding 2 slot/tháng, cam kết 6 tháng |
| **Nền tảng mở rộng** | Model B SaaS multi-tenant sẵn sàng |
| **Niềm tin thị trường** | novixa.vn + content SEO + demo chuyên nghiệp |

---

## 5. Chiến lược giai đoạn

### Phase 1 — Founding & Pilot (2026)

- **ICP hẹp:** GPP, 1–10 cửa, outgrow Excel/POS cơ bản
- **Offer:** Founding Early Access 299k/tháng × 4 tháng, full Phase 1
- **Delivery:** Migrate + training miễn phí (đổi case study)
- **Không:** đua giá POS rẻ, cam kết HĐĐT/AI vượt product

### Phase 2 — Scale SaaS (2027)

- Catalog giá công khai (Core / Growth / Chain)
- Model B multi-tenant là default
- Module thuế/kế toán sâu (Phase 2 product)
- Đối tác triển khai (nếu cần)

---

## 6. Giá trị cốt lõi (vận hành)

1. **Đúng lô, đúng tồn, đúng quy định** — trước khi “tính năng hay”
2. **Truth in product** — tài liệu và sales không vượt khả năng thật
3. **Đồng hành dược sĩ** — phần mềm quản lý, không tư vấn y khoa
4. **Dữ liệu là tài sản khách hàng** — tenant isolation, consent rõ ràng

---

## 7. Rủi ro chiến lược & mitigations

| Rủi ro | Mitigation |
|--------|------------|
| So sánh với POS 250–300k | Founding hook + premium ERP, không price war |
| Pilot quá rộng | Founding cap, checklist go-live |
| Over-promise AI/thuốc QG | Roadmap label, mock mode documented |
| Doc lệch product | Bộ tài liệu NVX-* single source of truth |

---

## 8. Tham chiếu

- [Product overview](../02-product/product-overview-v1.md)
- [ICP & Pricing](../04-gtm/icp-positioning-pricing-v1.md)
- [V1 Documentation Plan](../V1-DOCUMENTATION-PLAN.md)
- Website: `novixa-site/src/i18n/vi.json`

---

*Owner: Leadership / Product · Review: Q4/2026*
