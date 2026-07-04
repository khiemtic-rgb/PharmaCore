# Novixa — Checklist Go-live (Khách hàng)

**Mã:** NVX-CS-02 / DOC-009 · **Tier:** T1/T2 · **Trạng thái:** Draft · **Version:** 1.0

> Dành cho **chủ nhà thuốc / dược sĩ quản lý** — ngôn ngữ vận hành, không jargon kỹ thuật.  
> Novixa và quý nhà thuốc **cùng tick** trước ngày bán hàng thật trên Novixa.

**Liên quan:** [Onboarding playbook](./onboarding-playbook-v1.md) · Checklist kỹ thuật nội bộ: `client/admin/pilot-go-live-checklist.md`

---

## Thông tin go-live

| | |
|---|---|
| **Tên nhà thuốc** | |
| **Mã nhà thuốc (đăng nhập)** | |
| **Số cửa / quầy** | |
| **Ngày go-live mục tiêu** | |
| **Người liên hệ Novixa** | |

---

## A. Trước khi bắt đầu (Tuần 0)

### A.1 Novixa chuẩn bị

- [ ] Tạo tài khoản nhà thuốc trên hệ thống
- [ ] Cấu hình chi nhánh / quầy bán
- [ ] Tạo tài khoản **Quản trị** và **Thu ngân** (mật khẩu riêng — không dùng chung)
- [ ] Gửi link đăng nhập và hướng dẫn ngắn

### A.2 Quý nhà thuốc chuẩn bị

- [ ] Chỉ định **1 người phụ trách** (chủ / dược sĩ) làm việc với Novixa
- [ ] Chuẩn bị file **danh mục thuốc** (Excel hoặc theo mẫu Novixa)
- [ ] Chuẩn bị **tồn đầu**: mã hàng, số lô, hạn dùng, số lượng (nếu quản lý lô)
- [ ] Danh sách **nhà cung cấp** thường dùng
- [ ] Lên lịch **3 buổi đào tạo** (mỗi buổi ~2 giờ)

---

## B. Dữ liệu (Tuần 1–2)

### B.1 Danh mục sản phẩm

- [ ] Import / nhập xong **≥ 80%** hàng bán hàng ngày
- [ ] Mỗi sản phẩm có: **mã**, **tên**, **đơn vị**, **giá bán** (và barcode nếu có)
- [ ] Quý NT **đã rà soát** tên và giá trên màn hình admin

### B.2 Tồn đầu kỳ

- [ ] Nhập tồn theo **lô và hạn dùng** (với thuốc có quản lý lô)
- [ ] **Tổng tồn** trên Novixa khớp với sổ / Excel cũ (sai số đã giải trình)
- [ ] Hai bên **ký xác nhận** đối soát tồn đầu *(email hoặc biên bản)*

### B.3 Nhà cung cấp & kho

- [ ] Nhà cung cấp chính đã có trên hệ thống
- [ ] Kho / quầy mặc định đúng với thực tế

---

## C. Đào tạo (Tuần 3)

| Buổi | Nội dung | Người tham dự | Hoàn thành |
|------|----------|---------------|------------|
| 1 | Quản lý: nhập hàng, xem tồn, báo cáo cơ bản | Chủ / quản lý / dược sĩ | ☐ |
| 2 | Quầy: mở ca, bán hàng, in bill, trả hàng | Thu ngân / dược sĩ quầy | ☐ |
| 3 | Kiểm kê, cảnh báo hSD, app khách (nếu dùng) | Quản lý + quầy | ☐ |

- [ ] Mỗi người bán hàng **tự thực hành ≥ 10 đơn thử** (không tính doanh thu thật hoặc đơn test đã đánh dấu)
- [ ] Quy trình **mở ca — đóng ca** đã thử ít nhất 1 lần

---

## D. Kiểm tra trước go-live (Tuần 4)

Quý nhà thuốc thực hiện cùng Novixa:

### D.1 Bán hàng (POS)

- [ ] Quét / chọn sản phẩm · thanh toán · in bill **OK**
- [ ] Hệ thống **ưu tiên lô sắp hết hạn** (FEFO) — đúng kỳ vọng quầy
- [ ] Trả hàng 1 đơn thử **OK**

### D.2 Nhập hàng

- [ ] Tạo đơn nhập (GRN) thử → tồn tăng đúng **OK**

### D.3 Báo cáo

- [ ] Xem được báo cáo **doanh thu** và **tồn kho**
- [ ] Xuất file (CSV) nếu cần đối soát

### D.4 App khách *(nếu tham gia gói có O2O / loyalty)*

- [ ] Khách đăng nhập OTP **OK** *(hoặc đã thống nhất lịch bật SMS)*
- [ ] Tích điểm / đặt trước thử **OK**

---

## E. Quy ước ngày go-live

- [ ] **Ngày G:** chuyển sang bán hàng thật trên Novixa tại quầy đã thống nhất
- [ ] Quầy **không song song** 2 phần mềm bán lẻ cho cùng một ca *(trừ giai đoạn chuyển tiếp ≤ 3 ngày đã thống nhất)*
- [ ] Novixa **hypercare 14 ngày** sau go-live (hỗ trợ ưu tiên)

---

## F. Quý nhà thuốc cần biết (giới hạn Phase 1)

| Nội dung | Trạng thái |
|----------|------------|
| Hóa đơn điện tử | Đang lộ trình — chưa tích hợp đầy đủ |
| Tra cứu thuốc quốc gia | Tham khảo — chưa thay nguồn chính thức Bộ Y tế |
| Novixa | Phần mềm quản lý — **không** thay tư vấn y khoa tại quầy |
| SMS OTP app khách | Cần cấu hình nhà mạng — Novixa hỗ trợ theo tiến độ đã báo |

Chi tiết: [GPP vận hành](../06-compliance/gpp-operational-context-v1.md)

---

## G. Sign-off go-live

Chúng tôi xác nhận:

- Dữ liệu danh mục và tồn đầu đã đối soát
- Nhân sự quầy đã được đào tạo
- Sẵn sàng bán hàng thật từ ngày: _______________

| | Họ tên | Chữ ký | Ngày |
|---|--------|--------|------|
| **Chủ / đại diện nhà thuốc** | | | |
| **Novixa triển khai** | | | |

---

## H. Sau go-live — 30 / 90 ngày *(tuỳ chọn founding)*

| Mốc | Việc |
|-----|------|
| **Ngày 7** | Check-in vận hành — blocker P0 |
| **Ngày 30** | Review adoption · điều chỉnh quy trình |
| **Ngày 90** | Case study *(nếu đồng ý trong HĐ founding)* |

---

## Tham chiếu

- [Founding terms](../04-gtm/founding-program-terms-v1.md)
- [Onboarding playbook](./onboarding-playbook-v1.md)

---

*Owner: Customer Success · In PDF cho khách khi kickoff*
