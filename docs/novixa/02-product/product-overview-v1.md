# Novixa — Tổng quan sản phẩm V1

**Mã:** NVX-PRD-01 · **Tier:** T1/T2 · **Trạng thái:** Draft · **Version:** 1.0

---

## 1. Novixa là gì?

**Novixa** là nền tảng phần mềm quản lý nhà thuốc (ERP + POS + CRM + app khách) cho thị trường Việt Nam, xây trên lõi **PharmaCore**.

**Không phải:** POS thu ngân đơn giản · phần mềm kê toán thay thế · tư vấn y khoa.

---

## 2. Thành phần sản phẩm

| Thành phần | Người dùng | URL mục tiêu | Trạng thái V1 |
|------------|------------|--------------|---------------|
| **Admin Web** | Chủ NT, quản lý, dược sĩ | admin.novixa.vn | ✅ Phase 1 |
| **POS (trong Admin + Staff mobile)** | Thu ngân, dược sĩ quầy | pos.novixa.vn | ✅ / Pilot |
| **Customer App** | Khách hàng nhà thuốc | app.novixa.vn | ✅ |
| **API** | Tích hợp nội bộ | api.novixa.vn | ✅ |
| **Marketing site** | Khách tiềm năng | novixa.vn | ✅ (tách deploy) |

---

## 3. Luồng vận hành end-to-end

```
Danh mục → Nhập hàng (PO/GRN) → Tồn kho lô (FEFO)
    → Bán POS (ca, thanh toán, in bill) → Trả hàng
    → CRM / Loyalty / App khách (O2O, chat, đặt trước)
    → Báo cáo & cảnh báo (doanh thu, tồn, HSD)
```

---

## 4. Phase 1 vs Phase 2

| | Phase 1 (V1) | Phase 2 (roadmap) |
|---|--------------|-------------------|
| **Mục tiêu** | Vận hành nhà thuốc / chuỗi nhỏ đủ cạnh tranh | Thuế/kế toán chuyên sâu |
| **Thuế GTGT** | Cấu hình cơ bản trên PO/GRN | Báo cáo thuế đầu vào, export kế toán |
| **HĐĐT** | Roadmap | Tích hợp |
| **Nguồn truth** | `client/admin/PHASE_SCOPE.md` | Feature flags trong code |

**Cấu hình phase:** `client/admin/src/shared/product/product-phases.ts`

---

## 5. Nguyên tắc thiết kế sản phẩm

1. **Catalog không chứa tồn/giá** — tồn theo lô, giá theo ngữ cảnh bán
2. **stock_movements = sổ cái** — quantity_available là cache
3. **Bán xuất theo FEFO** — hết hạn trước
4. **Kiểm kê / chuyển kho** — theo lô
5. **Multi-tenant** — tenant_id trên dữ liệu nghiệp vụ
6. **Marketing site tách ERP** — bảo mật, deploy độc lập

---

## 6. Đối tượng phù hợp (tóm tắt)

✅ Nhà thuốc GPP muốn gom quầy + lô + khách  
✅ Chuỗi 2–10 cửa hoặc đơn lẻ outgrow Excel  
❌ Chỉ cần thu ngân, không quan tâm lô/HSD  

Chi tiết: [ICP & Positioning](../04-gtm/icp-positioning-pricing-v1.md)

---

## 7. Roadmap công khai (rút gọn)

| Thời gian | Trọng tâm |
|-----------|-----------|
| Q2–Q3/2026 | Founding, POS ổn định, app khách O2O |
| Q4/2026 | Mua hàng mở rộng, báo cáo CRM |
| 2027 | SaaS scale, Phase 2 thuế (khi sẵn sàng) |

---

## 8. Tham chiếu kỹ thuật

- Module catalog: [module-catalog-v1.md](./module-catalog-v1.md)
- Architecture: [solution-architecture-v1.md](../03-solution/solution-architecture-v1.md)
- Reports: `client/admin/REPORTS_WAVE1.md`

---

*Owner: Product · Review: mỗi release minor*
