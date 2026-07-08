# Novixa — Founding Early Access Program Terms V1

**Mã:** NVX-GTM-08 / DOC-008 · **Tier:** T2 · **Trạng thái:** Draft · **Version:** 1.0

> **Disclaimer:** Bản Draft nội bộ — **không phải văn bản pháp lý cuối cùng**. Cần rà soát bởi tư vấn pháp lý trước khi ký với khách hàng.  
> **Public summary:** `novixa-site/src/i18n/vi.json` (founding, foundingFaq)

---

## 1. Tên chương trình

**Novixa Founding Early Access** — giai đoạn vận hành thật tại quầy nhà thuốc với ưu đãi giới hạn, đổi lại phản hồi sản phẩm và (tuỳ thỏa thuận) tham gia case study.

**Nhà cung cấp:** Novixa (Smart Pharmacy Solutions) — nền tảng phần mềm KitPlatform.

---

## 2. Đối tượng tham gia

### 2.1 Eligible (đủ điều kiện)

- Nhà thuốc có **Giấy chứng nhận GPP** hợp lệ tại Việt Nam
- Quy mô: **1–10 cửa** (ưu tiên 2–10 hoặc đơn lẻ outgrow Excel/POS cơ bản)
- Có **người quyết định** tham gia demo, kickoff và ít nhất 1 buổi training
- Đồng ý **hợp đồng tối thiểu 6 tháng** (mục 4)
- Cung cấp dữ liệu migrate hợp lý (danh mục, tồn đầu) trong khung thời gian onboarding

### 2.2 Không eligible

- Chỉ cần phần mềm thu ngân, không yêu cầu quản lý lô/HSD
- Từ chối migrate / training / cam kết thời hạn tối thiểu
- Yêu cầu cam kết tính năng **ngoài Phase 1** (HĐĐT đầy đủ, kế toán thuế chuyên sâu, CSDL Dược QG live) như đã có sẵn

---

## 3. Quyền lợi Founding

### 3.1 Giá ưu đãi

| Hạng mục | Giá trị |
|----------|---------|
| **Phí nền tảng** | **299.000 VNĐ / tháng** (ba trăm chín mươi chín nghìn đồng) |
| **Thời hạn ưu đãi** | **4 tháng đầu** kể từ ngày go-live hoặc ngày bắt đầu tính phí (theo HĐ) |
| **Số slot** | Tối đa **~2 nhà thuốc / tháng**, tổng chương trình **~10 founding** (Novixa có quyền điều chỉnh cap) |

### 3.2 Phạm vi sản phẩm (Phase 1)

Trong thời gian founding, khách được dùng **đầy đủ tính năng Phase 1**, bao gồm không giới hạn:

- Admin ERP (danh mục, mua hàng, kho lô, CRM, báo cáo Wave 1, hệ thống)
- POS (web + staff mobile theo triển khai)
- Customer App (OTP, loyalty, O2O, chat, reminders… theo cấu hình tenant)
- Hỗ trợ multi-chi nhánh trong phạm vi gói đã thống nhất

**Chi tiết kỹ thuật:** [module-catalog-v1.md](../02-product/module-catalog-v1.md)

### 3.3 Dịch vụ kèm theo (founding)

| Dịch vụ | Mô tả | Điều kiện |
|---------|--------|-----------|
| **Migrate danh mục** | Import sản phẩm từ Excel/file khách | Khách cung cấp file đúng template |
| **Migrate tồn đầu** | Nhập tồn theo lô/HSD (opening balance) | Đối soát & ký xác nhận với chủ NT |
| **Training** | Tối đa **3 buổi × ~2h** (admin, POS, nâng cao) | Lịch trong **4 tuần** onboarding |
| **Hypercare** | Hỗ trợ ưu tiên **14 ngày** sau go-live | Trong giờ làm việc đã thống nhất |

**Case study (tuỳ thỏa thuận):** Khách đồng ý cho Novixa sử dụng tên NT (hoặc ẩn danh), quote và số liệu đã được duyệt — đổi lại **miễn phí migrate + training** như mục trên.

---

## 4. Cam kết thời hạn

| Hạng mục | Chi tiết |
|----------|----------|
| **Thời hạn tối thiểu** | **6 tháng** liên tục |
| **Cấu trúc** | 4 tháng founding (299k) + **2 tháng** ở gói đã chọn sau chốt (mục 5) |
| **Chấm dứt sớm** | Theo điều khoản HĐ chính thức *(Legal fill-in)* |

---

## 5. Sau 4 tháng founding — chốt gói

### 5.1 Nguyên tắc

- **Tháng thứ 5:** Khách và Novixa **chốt gói** theo mức sử dụng thực tế
- Novixa **không tự động nâng giá** — có **xác nhận bằng văn bản** (email/phụ lục HĐ) trước khi áp dụng mức phí mới
- **Tháng 3** (trong kỳ founding): Novixa gửi **báo cáo sử dụng** (module active, cửa, volume) để chuẩn bị chốt gói

### 5.2 Gói tham chiếu (draft — chưa public)

| Gói | Hướng sử dụng | Ghi chú |
|-----|---------------|---------|
| **Core** | Quầy + kho lô + mua hàng + báo cáo cơ bản | 1 cửa |
| **Growth** | Core + app khách, loyalty, O2O, CRM đầy đủ | |
| **Chain** | Multi-branch, báo cáo tập trung | 2–10 cửa |

**Giá cụ thể từng gói:** trao đổi tại demo và **ghi rõ trong phụ lục HĐ** — catalog công khai dự kiến sau giai đoạn founding (2027).

---

## 6. Trách nhiệm các bên

### 6.1 Novixa

- Cung cấp nền tảng SaaS theo SLA hỗ trợ đã thống nhất *(SLA draft: NVX-OPS-05)*
- Triển khai tenant, migrate và training trong khung onboarding
- Bảo mật dữ liệu tenant (isolation, HTTPS, backup theo chính sách vận hành)
- Thông báo bảo trì có kế hoạch trước *(thời gian fill-in)*

### 6.2 Khách hàng

- Cung cấp thông tin GPP, liên hệ, dữ liệu migrate đúng hạn
- Tham gia training; chỉ định **admin** và **dược sĩ/quản lý quầy**
- Vận hành đúng quy trình (nhập lô/HSD, FEFO) — phần mềm không thay quy trình GPP
- Thanh toán phí đúng hạn theo HĐ
- Không chia sẻ tài khoản admin; đổi mật khẩu mặc định ngay sau cấp quyền

---

## 7. Giới hạn & disclaimer sản phẩm

Khách **xác nhận đã được thông báo** các giới hạn Phase 1:

| Hạng mục | Trạng thái V1 |
|----------|---------------|
| Hóa đơn điện tử tích hợp | Roadmap Phase 2 |
| Báo cáo thuế / kế toán chuyên sâu | Roadmap Phase 2 |
| Danh mục thuốc quốc gia (QĐ 522) live | Mock / tra cứu tham khảo |
| SMS OTP | Cần gateway — pilot có thể dùng cơ chế nội bộ đến khi cấu hình |
| AI Copilot | Rule-based / roadmap — **không** thay tư vấn dược |
| Novixa **không** tư vấn y khoa | Chat app ≠ chẩn đoán / kê đơn |

Chi tiết: [gpp-operational-context-v1.md](../06-compliance/gpp-operational-context-v1.md)

---

## 8. Dữ liệu & bảo mật (tóm tắt)

- Dữ liệu nghiệp vụ thuộc **khách hàng**; Novixa xử lý theo vai trò **processor/host**
- Tenant isolation — dữ liệu không lẫn giữa các nhà thuốc
- Consent app khách theo cấu hình tenant
- Chi tiết: NVX-CPL-02 *(Planned)*

---

## 9. Sở hữu trí tuệ & case study

- Phần mềm Novixa/KitPlatform thuộc quyền Novixa
- Dữ liệu danh mục, khách, giao dịch do khách nhập — thuộc khách
- **Case study:** Novixa được quyền dùng logo/tên/quote/số liệu đã **duyệt bằng văn bản** cho marketing; khách có quyền yêu cầu ẩn danh một phần

---

## 10. Quy trình tham gia

```
1. Đăng ký (novixa.vn — ghi FOUNDING) hoặc giới thiệu
2. Qualify call + Demo
3. Ký HĐ + phụ lục Founding (bản Legal)
4. Kickoff (W0) → Onboard ≤ 4 tuần
5. Go-live POS
6. Tháng 3: báo cáo sử dụng
7. Tháng 5: chốt gói + phụ lục giá
```

Handoff CS: [onboarding-playbook-v1.md](../07-customer/onboarding-playbook-v1.md)

---

## 11. Phụ lục A — Checklist ký HĐ (Sales)

- [ ] ICP fit xác nhận
- [ ] Demo đã show đúng Phase 1 (không HĐĐT/AI live)
- [ ] Số cửa, số user, nguồn migrate ghi trong HĐ
- [ ] Ngày go-live mục tiêu
- [ ] Case study: có / không / ẩn danh
- [ ] Contact kỹ thuật + contact thanh toán

---

## 12. Phụ lục B — Template email chốt founding (draft)

**Subject:** Novixa Founding Early Access — xác nhận điều khoản

Kính gửi [Tên],

Cảm ơn [Tên NT] đã tham gia demo Novixa. Tóm tắt Founding Early Access:

- **299.000đ/tháng × 4 tháng đầu** — full Phase 1  
- **Hợp đồng tối thiểu 6 tháng**  
- Migrate + training *(case study nếu đồng ý)*  
- **Tháng 5:** chốt gói theo mức dùng — không tự nâng giá  

Đính kèm: Sales deck · Go-live checklist (khách) · HĐ draft

Trân trọng,  
[Tên Sales] · Novixa

---

## 13. Changelog & Legal

| Version | Ngày | Ghi chú |
|---------|------|---------|
| 1.0 | 2026-07-04 | Draft nội bộ |

**Legal TODO:** Điều khoản thanh toán, phạt chấm dứt sớm, SLA, luật áp dụng, force majeure.

---

## Tham chiếu

- [ICP & Pricing](./icp-positioning-pricing-v1.md)
- [Sales deck](../launch/DOC-008/sales-deck-v1.md)
- [Go-live checklist khách](../07-customer/go-live-checklist-customer-v1.md)

---

*Owner: GTM / Legal · Không publish nguyên văn lên web — dùng summary trong vi.json*
