# Novixa — Bối cảnh GPP vận hành V1

**Mã:** NVX-CPL-01 · **Tier:** T1/T2 · **Trạng thái:** Draft · **Version:** 1.0

> **Disclaimer:** Novixa là **phần mềm quản lý**, không thay thế tư vấn pháp lý hay dược lâm sàng. Khách hàng chịu trách nhiệm tuân thủ quy định hiện hành.

---

## 1. Mục đích tài liệu

Giúp **dược sĩ, chủ nhà thuốc và team CS** hiểu Novixa hỗ trợ **vận hành theo tinh thần GPP** như thế nào — và **giới hạn** phần mềm không cover.

---

## 2. GPP trong ngữ cảnh Novixa

**Good Pharmacy Practice (Thực hành tốt nhà thuốc)** yêu cầu quy trình rõ ràng về:

- Bảo quản, phân loại thuốc
- Theo dõi nguồn gốc, hạn dùng
- Ghi chép mua — bán — tồn
- Nhân sự có trách nhiệm chuyên môn

Novixa **hỗ trợ ghi nhận và truy vết dữ liệu** trên các luồng mua — tồn — bán, **không** đánh giá chất lượng chuyên môn dược.

---

## 3. Ánh xạ chức năng ↔ nhu cầu vận hành GPP

| Nhu cầu vận hành | Module Novixa | Cách hỗ trợ |
|------------------|---------------|-------------|
| Theo dõi **lô & HSD** | Inventory (batches) | Mỗi lô có số lô, HSD, tồn riêng |
| **FEFO** khi bán | Sales / POS | Xuất kho ưu tiên hết hạn trước |
| Ghi nhận **nhập hàng** | Procurement (GRN) | PO → GRN → tăng tồn theo lô |
| **Kiểm kê** định kỳ | Inventory Count | Workflow kiểm — điều chỉnh có audit |
| **Cảnh báo** cận date / tồn thấp | Inventory Alerts | Báo cáo INV-02, low stock |
| **Truy vết** biến động | stock_movements + audit | Lịch sử xuất/nhập theo lô |
| **Phân quyền** | System (roles) | RBAC theo vai trò quầy/kho/quản lý |
| **Hồ sơ khách** (CRM) | Customer | Không thay hồ sơ bệnh án — consent rõ |

---

## 4. Quy trình khuyến nghị (SOP gợi ý)

### 4.1 Nhập hàng

1. Tạo PO → nhận GRN với **số lô, HSD, số lượng**
2. Kiểm tra hàng thực tế vs GRN trước post
3. Lưu chứng từ NCC ngoài hệ thống (Novixa lưu số liệu GRN)

### 4.2 Bán lẻ

1. Mở ca POS
2. Bán — hệ thống chọn lô FEFO (user không override lô tùy tiện trừ workflow đặc biệt)
3. In bill / lưu đơn
4. Đóng ca — đối soát báo cáo ca

### 4.3 Kiểm kê

1. Tạo phiên kiểm kê theo kho
2. Đếm thực tế theo lô
3. Duyệt chênh lệch → điều chỉnh có log

### 4.4 Hàng cận date

1. Chạy báo cáo INV-02 hàng tuần
2. Ưu tiên bán / trả NCC / hủy theo quy định nội bộ & pháp luật

---

## 5. Giới hạn & trách nhiệm

| Hạng mục | Novixa | Khách hàng |
|----------|--------|------------|
| Tuân thủ GPP đạt chứng nhận | Không cam kết | Chịu trách nhiệm |
| Bảo quản vật lý (tủ lạnh…) | Không giám sát IoT V1 | Quy trình nội bộ |
| Thuốc kê đơn / hạn chế | Catalog flags cơ bản | Dược sĩ kiểm tra |
| Danh mục thuốc QG QĐ 522 | Mock tra cứu V1 | Xác minh nguồn chính thức |
| Tư vấn sử dụng thuốc | App chat ≠ tư vấn y khoa | Dược sĩ tại quầy |
| HĐĐT, báo cáo thuế | Phase 2 | Kế toán khách hàng |

---

## 6. Dữ liệu & consent (app khách)

- Khách đồng ý consent trước chat, health wallet
- Tenant isolation — dữ liệu KH không lẫn giữa nhà thuốc
- Chi tiết: NVX-CPL-02 *(Planned)*

---

## 7. Audit & lưu trữ

- **audit_logs:** thao tác quan trọng trên admin
- **stock_movements:** sổ biến động tồn
- Retention policy: NVX-CPL-03 *(Planned)*

---

## 8. Training GPP-aware

Khi onboard, CS nhấn mạnh:

1. Nhập đúng lô/HSD ngay từ GRN
2. Không bán ngoài FEFO trừ exception có log
3. Kiểm kê định kỳ — không chỉ cuối năm
4. Phân quyền: thu ngân ≠ sửa giá / điều chỉnh kho

→ [Training curriculum](./training-curriculum-v1.md) *(Planned)*

---

## 9. Tham chiếu

- [Onboarding playbook](../07-customer/onboarding-playbook-v1.md)
- [Module catalog](../02-product/module-catalog-v1.md)
- Demo: `demo-inventory-count-checklist.md`, `demo-pos-checklist.md`

---

*Owner: Compliance / CS · Review: hàng năm hoặc khi đổi quy định*
