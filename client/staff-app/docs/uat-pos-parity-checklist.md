# UAT — Parity App bán hàng (pos.novixa.vn) vs Admin POS

Tài liệu kiểm thử tay cho nhân viên quầy trước go-live.  
Mỗi mục: thực hiện trên **App** và đối chiếu **Admin** (`admin.novixa.vn/sales/pos` hoặc module tương ứng).

**Ký hiệu**

| Ký hiệu | Ý nghĩa |
|---------|---------|
| ✅ | App đủ — làm được như desktop |
| ⚠️ | App thiếu một phần — ghi chú bên dưới |
| ❌ | Chỉ có trên Admin — dùng máy tính |
| ☐ | Chưa test / chưa pass |

---

## 0. Chuẩn bị

| # | Hạng mục | App | Admin | Ghi chú |
|---|----------|-----|-------|---------|
| 0.1 | URL | `https://pos.novixa.vn` | `https://admin.novixa.vn` | |
| 0.2 | Tài khoản thu ngân | `quay_*` / mật khẩu chi nhánh | `admin` hoặc cùng user | Role `QUAY` cần `sales.*` + `inventory.*` |
| 0.3 | Ít nhất 2 kho (2 quầy) | ☐ | ☐ | VD: Kho quầy 1, Kho quầy 2 |
| 0.4 | Ca đang mở tại kho bán | ☐ | ☐ | Bắt buộc trước thanh toán |
| 0.5 | Hard refresh / xóa cache PWA | ☐ | ☐ | Tránh bundle cũ |

**Sản phẩm demo (nếu dùng seed local)**

| Mã | Mô tả |
|----|--------|
| `8934567890012` | Barcode Paracetamol 500mg |
| `LOT2026A` | Số lô demo |
| `PARA500` | Mã SP |

---

## 1. Hub (màn chính App)

| # | Nút / hành vi | App | Admin tương đương | Parity | ☐ Pass |
|---|---------------|-----|-------------------|--------|--------|
| 1.1 | **Bán hàng** → POS | Có | Sales → POS | ✅ | ☐ |
| 1.2 | **Khách + OTP** | Có | Sales → Khách / OTP | ✅ | ☐ |
| 1.3 | **Chat** (badge chưa đọc) | Có | Sales → Chat | ✅ | ☐ |
| 1.4 | **Giữ hàng** | Có | Sales → Giữ hàng khách | ✅ | ☐ |
| 1.4b | **Đơn nháp app khách** | Có | Sales → Đơn nháp khách | ✅ | ☐ |
| 1.5 | **Tra tồn** | Có | Kho → Tồn / POS tra tồn | ✅ (P0: chọn đa kho) | ☐ |
| 1.6 | **Chuyển kho** | Có | Kho → Chuyển kho | ✅ | ☐ |
| 1.6b | **Kiểm kê** | Có | Kho → Kiểm kê | ✅ | ☐ |
| 1.6c | **Nhập hàng (GRN)** | Có (rút gọn) | Mua hàng → Phiếu nhập | ✅ cần `procurement.*` | ☐ |
| 1.7 | **Đơn nháp** | Có | Sales → Đơn (status nháp) | ✅ | ☐ |
| 1.8 | **Đơn & in lại** | Có | Sales → Đơn hàng | ⚠️ App rút gọn tìm kiếm | ☐ |
| 1.9 | **Thu công nợ** | Có | Sales → Thu nợ | ✅ | ☐ |
| 1.10 | **Trả hàng** | Có | Sales → Trả hàng | ✅ | ☐ |
| 1.11 | **Hôm nay** (ca) | Có | Sales → Ca làm việc | ✅ | ☐ |
| 1.12 | **Đăng xuất** | Có | — | ✅ | ☐ |
| 1.13 | Báo cáo / cấu hình | Ghi chú → Admin | Báo cáo, Cài đặt | ❌ (chủ đích) | ☐ |

---

## 2. POS — Bán hàng (`/pos`)

### 2.1 Header & ca

| # | Nút / thông tin | App | Admin POS | Parity | ☐ Pass |
|---|-----------------|-----|-----------|--------|--------|
| 2.1.1 | Dropdown **chọn kho** | Có | Có | ✅ | ☐ |
| 2.1.2 | Đổi kho → **xóa giỏ** | Có | Có | ✅ | ☐ |
| 2.1.3 | Hiển thị **ca đang mở** / chưa mở | Có | Có | ✅ | ☐ |
| 2.1.4 | Tap ca → drawer **Mở ca** | Có | Modal mở ca | ✅ | ☐ |
| 2.1.5 | Tap ca → **Xem hôm nay** | Có | Sales → Ca | ✅ | ☐ |
| 2.1.6 | Tap ca → **Đóng ca** (từ drawer) | Có | Ca làm việc | ✅ | ☐ |

### 2.2 Tìm & thêm sản phẩm

| # | Hành vi | App | Admin POS | Parity | ☐ Pass |
|---|---------|-----|-----------|--------|--------|
| 2.2.1 | Ô tìm tên / mã / SKU | Có | Có | ✅ | ☐ |
| 2.2.2 | Kết quả: tên, mã, giá, **tồn** | Có | Có | ✅ | ☐ |
| 2.2.3 | Tap SP → thêm giỏ | Có | Có | ✅ | ☐ |
| 2.2.4 | **Quét barcode** (camera) | Có | Có (input) | ✅ | ☐ |
| 2.2.5 | Quét **GS1 / số lô** (batch mode) | Có | Có | ✅ | ☐ |
| 2.2.6 | Cảnh báo **hết tồn** | Có | Có | ✅ | ☐ |
| 2.2.7 | Cảnh báo **vượt tồn** | Có | Có | ✅ | ☐ |

### 2.3 Giỏ hàng

| # | Hành vi | App | Admin POS | Parity | ☐ Pass |
|---|---------|-----|-----------|--------|--------|
| 2.3.1 | Tăng / giảm số lượng | Có | Có | ✅ | ☐ |
| 2.3.2 | Xóa dòng | Có | Có | ✅ | ☐ |
| 2.3.3 | Chọn **lô** (FEFO / dropdown) | Có | Có | ✅ | ☐ |
| 2.3.4 | Chiết khấu **theo dòng** (% / VND) | Có | Có | ✅ | ☐ |
| 2.3.5 | Chiết khấu **theo đơn** | Có | Có | ✅ | ☐ |
| 2.3.6 | Gắn **khách hàng** | Có | Có | ✅ | ☐ |
| 2.3.7 | Tạo khách nhanh | Có | Có | ✅ | ☐ |
| 2.3.8 | **Lưu nháp** đơn | Có | Có | ✅ | ☐ |
| 2.3.9 | Mở **đơn nháp** | Có (`/drafts`) | Có | ✅ | ☐ |
| 2.3.10 | Mở **đơn nháp app khách** | Có (`/customer-drafts` + deep link POS) | Có (tab riêng) | ✅ | ☐ |
| 2.3.11 | Nút **Thanh toán** | Có | Có | ✅ | ☐ |
| 2.3.12 | Chặn thanh toán khi **chưa mở ca** | Có | Có | ✅ | ☐ |

---

## 3. Thanh toán (`/checkout`)

| # | Hành vi | App | Admin POS | Parity | ☐ Pass |
|---|---------|-----|-----------|--------|--------|
| 3.1 | Tóm tắt: tạm tính, CK dòng/đơn, phải thu | Có | Có | ✅ | ☐ |
| 3.2 | Chọn **voucher** khách | Có | Có | ✅ | ☐ |
| 3.3 | **Đổi điểm loyalty** | Có (switch) | Có | ✅ | ☐ |
| 3.4 | **Đa hình thức thanh toán** | Có | Có | ✅ | ☐ |
| 3.5 | Thêm dòng thanh toán | Có | Có | ✅ | ☐ |
| 3.6 | **Ghi nợ** (khách được phép) | Có | Có | ✅ | ☐ |
| 3.7 | Tiền thối (tiền mặt) | Có | Có | ✅ | ☐ |
| 3.8 | Nút **Chốt đơn** | Có | Có | ✅ | ☐ |
| 3.9 | Sau chốt → màn **In bill** | Có | Có | ✅ | ☐ |
| 3.10 | Đơn từ **giữ hàng** tự đánh dấu đã lấy | Có | Có | ✅ | ☐ |
| 3.11 | Đơn từ **nháp app khách** tự link sale | Có | Có | ✅ | ☐ |

---

## 4. In bill (`/receipt`)

| # | Hành vi | App | Admin | Parity | ☐ Pass |
|---|---------|-----|-------|--------|--------|
| 4.1 | Preview nội dung bill | Có | Có | ✅ | ☐ |
| 4.2 | Nút **In bill** (`window.print`) | Có | Có | ✅ | ☐ |
| 4.3 | Nút **Đơn mới** → về POS | Có | Có | ✅ | ☐ |

---

## 5. Khách + OTP (`/customers`)

| # | Hành vi | App | Admin | Parity | ☐ Pass |
|---|---------|-----|-------|--------|--------|
| 5.1 | Tìm khách theo tên / SĐT | Có | Có | ✅ | ☐ |
| 5.2 | Xem chi tiết khách | Có | Có | ✅ | ☐ |
| 5.3 | Hiển thị **OTP pilot** (poll tự động) | Có | Có | ✅ | ☐ |
| 5.4 | Copy mã OTP | Có | Có | ✅ | ☐ |
| 5.5 | Tạo / sửa khách đầy đủ | Rút gọn | CRM đầy đủ | ⚠️ | ☐ |

---

## 6. Chat (`/chat`)

| # | Hành vi | App | Admin | Parity | ☐ Pass |
|---|---------|-----|-------|--------|--------|
| 6.1 | Danh sách hội thoại + badge | Có | Có | ✅ | ☐ |
| 6.2 | Gửi / nhận tin | Có | Có | ✅ | ☐ |
| 6.3 | Đánh dấu đã đọc | Có | Có | ✅ | ☐ |

---

## 7. Giữ hàng (`/reservations`)

| # | Hành vi | App | Admin | Parity | ☐ Pass |
|---|---------|-----|-------|--------|--------|
| 7.1 | Danh sách đơn Pending / Confirmed / Ready | Có | Có | ✅ | ☐ |
| 7.2 | **Xác nhận** (Pending → Confirmed) | Có | Có | ✅ | ☐ |
| 7.3 | **Sẵn sàng** (Confirmed → Ready) | Có | Có | ✅ | ☐ |
| 7.4 | **Đưa vào POS** (nạp giỏ + khách) | Có | Có | ✅ | ☐ |
| 7.5 | Từ chối / ghi chú staff | Có (từ chối + ghi chú) | Đầy đủ hơn | ✅ | ☐ |

---

## 8. Tra tồn (`/stock`) — P0

| # | Hành vi | App | Admin (Kho → Tồn) | Parity | ☐ Pass |
|---|---------|-----|-------------------|--------|--------|
| 8.1 | **Chọn kho** (dropdown, mọi kho được phép) | Có | Có | ✅ | ☐ |
| 8.2 | Mặc định kho = kho POS đang chọn | Có | — | ✅ | ☐ |
| 8.3 | Đổi kho → tra tồn kho khác (VD quầy 2 xem quầy 1) | Có | Có | ✅ | ☐ |
| 8.4 | Tìm SP → xem tồn, giá, lô, HSD, FEFO | Có | Có | ✅ | ☐ |
| 8.5 | **Không** thêm vào giỏ từ màn này | Có | — | ✅ (chủ đích) | ☐ |

---

## 9. Chuyển kho (`/transfers`) — P0

| # | Hành vi | App | Admin (Kho → Chuyển kho) | Parity | ☐ Pass |
|---|---------|-----|--------------------------|--------|--------|
| 9.1 | Danh sách phiếu chuyển | Có | Có | ✅ | ☐ |
| 9.2 | **Tạo phiếu**: kho đi, kho đến, ghi chú | Có | Có | ✅ | ☐ |
| 9.3 | Thêm dòng: SP, **lô**, số lượng | Có | Có | ✅ | ☐ |
| 9.4 | Chỉ SP có tồn tại **kho đi** | Có | Có | ✅ | ☐ |
| 9.5 | Kho đi ≠ kho đến | Có | Có | ✅ | ☐ |
| 9.6 | Xem **chi tiết** phiếu | Có | Có | ✅ | ☐ |
| 9.7 | **Chốt hoàn tất** (trừ kho đi, cộng kho đến) | Có | Có | ✅ | ☐ |
| 9.8 | **Hủy** phiếu nháp | Có | Có | ✅ | ☐ |
| 9.9 | Cần quyền `inventory.write` | Có | Có | ✅ | ☐ |

## 9b. Nhập hàng (`/goods-receipt`) — P1

| # | Hành vi | App | Admin | Parity | ☐ Pass |
|---|---------|-----|-------|--------|--------|
| 9b.1 | Danh sách phiếu nhập | Có | Có | ✅ | ☐ |
| 9b.2 | Tạo phiếu: NCC, kho, dòng lô/HSD/SL/giá | Có | Có | ✅ | ☐ |
| 9b.3 | Nạp từ PO chờ nhập | Có | Có | ✅ | ☐ |
| 9b.4 | **Lưu nháp** (chưa chốt tồn) | Có | Có | ✅ | ☐ |
| 9b.5 | **Hoàn tất nhập** | Có | Có | ✅ | ☐ |
| 9b.6 | **Hủy** phiếu chờ | Có | Có | ✅ | ☐ |
| 9b.7 | CK dòng/đơn, VAT phức tạp | Không | Có | ❌ → Admin | ☐ |

---

## 9c. Đơn nháp app khách (`/customer-drafts`)

| # | Hành vi | App | Admin | Parity | ☐ Pass |
|---|---------|-----|-------|--------|--------|
| 9c.1 | Danh sách Sent / Confirmed | Có | Có | ✅ | ☐ |
| 9c.2 | **Đưa vào POS** | Có | Có | ✅ | ☐ |
| 9c.3 | Deep link `/pos?customerDraftId=` | Có | Có | ✅ | ☐ |
| 9c.4 | Deep link `/pos?customerDraftId=&checkout=1` | Có | Có | ✅ | ☐ |
| 9c.5 | Sau bán → link sale | Có | Có | ✅ | ☐ |

---

## 9d. Deep link POS

| URL | Hành vi | ☐ Pass |
|-----|---------|--------|
| `/pos?draftId=` | Mở đơn nháp nội bộ | ☐ |
| `/pos?customerDraftId=` | Nạp đơn nháp app khách | ☐ |
| `/pos?customerReservationId=` | Nạp giữ hàng | ☐ |
| `&checkout=1` | Tự chuyển thanh toán sau nạp | ☐ |

---

## 10. Đơn & in lại (`/orders`)

| # | Hành vi | App | Admin (Sales → Đơn) | Parity | ☐ Pass |
|---|---------|-----|---------------------|--------|--------|
| 10.1 | Tìm theo **khách** hoặc **số HĐ** | Có | Có + lọc nâng cao | ⚠️ | ☐ |
| 10.2 | Xem chi tiết đơn | Có | Có | ✅ | ☐ |
| 10.3 | **In lại** bill | Có | Có | ✅ | ☐ |
| 10.4 | Mở đơn nháp để sửa | Có (`/drafts`) | Có | ✅ | ☐ |
| 10.5 | Hủy / void đơn | Không | Có (nếu có quyền) | ❌ → Admin | ☐ |

---

## 11. Thu công nợ (`/collect`)

| # | Hành vi | App | Admin | Parity | ☐ Pass |
|---|---------|-----|-------|--------|--------|
| 11.1 | Tìm khách nợ | Có | Có | ✅ | ☐ |
| 11.2 | Chọn đơn cần thu | Có | Có | ✅ | ☐ |
| 11.3 | Nhập số tiền thu + HTTT | Có | Có | ✅ | ☐ |
| 11.4 | In biên nhận thu | Có | Có | ✅ | ☐ |

---

## 12. Trả hàng (`/returns`)

| # | Hành vi | App | Admin | Parity | ☐ Pass |
|---|---------|-----|-------|--------|--------|
| 12.1 | Tìm đơn (khách / số HĐ) | Có | Có | ✅ | ☐ |
| 12.2 | Chỉ đơn **đã bán** / trả một phần | Có | Có | ✅ | ☐ |
| 12.3 | Chọn SL trả từng dòng | Có | Có | ✅ | ☐ |
| 12.4 | Nhập lý do | Có | Có | ✅ | ☐ |
| 12.5 | Xem preview hoàn tiền | Có | Có | ✅ | ☐ |
| 12.6 | Chốt trả hàng | Có | Có | ✅ | ☐ |

---

## 13. Hôm nay / Ca (`/today`)

| # | Hành vi | App | Admin (Sales → Ca) | Parity | ☐ Pass |
|---|---------|-----|--------------------|--------|--------|
| 13.1 | Xem ca đang mở | Có | Có | ✅ | ☐ |
| 13.2 | Doanh thu ca + theo HTTT | Có | Có | ✅ | ☐ |
| 13.3 | Tổng hợp **cả ngày** (tenant) | Có | Có | ✅ | ☐ |
| 13.4 | **Mở ca** | Có (từ POS drawer) | Có | ✅ | ☐ |
| 13.5 | **Đóng ca** | Có | Có | ✅ | ☐ |
| 13.6 | Cảnh báo **FEFO / lô ca** | Có (`label_required`) | Có | ✅ | ☐ |

---

## 14. Chỉ trên Admin (không yêu cầu App)

| Module | Lý do |
|--------|--------|
| Báo cáo doanh thu (CN, DM, xuất file) | Quản lý |
| Cài đặt loyalty / batch mode / receipt | Cấu hình một lần |
| Nhập kho, kiểm kê, điều chỉnh tồn | Kiểm kê + GRN rút gọn trên app · điều chỉnh sâu vẫn Admin |
| Đơn nháp nội bộ POS | ✅ App có **Đơn nháp** |
| Đơn nháp app khách (tab `customer-drafts`) | ✅ App có **Đơn nháp app khách** |

---

## 15. Kịch bản E2E bắt buộc — Quầy 2 thiếu hàng, lấy từ Quầy 1

**Mục tiêu:** Nhân viên chỉ dùng App, không cần Admin.

| Bước | Ai | Thao tác | Kết quả mong đợi | ☐ Pass |
|------|-----|----------|-------------------|--------|
| A | NV quầy 2 | App → **Tra tồn** → chọn **Kho quầy 1** → tìm SP | Thấy tồn > 0, lô/HSD | ☐ |
| B | NV quầy 2 | App → **Chuyển kho** → **Tạo phiếu** | | ☐ |
| B1 | | Kho đi = Quầy 1, Kho đến = Quầy 2 | | ☐ |
| B2 | | Thêm SP + lô + SL | Lưu thành công, trạng thái Chờ hoàn tất | ☐ |
| C | NV quầy 2 (hoặc QL) | Mở phiếu → **Chốt hoàn tất** | Trạng thái Hoàn tất | ☐ |
| D | NV quầy 2 | **Tra tồn** → chọn **Kho quầy 2** | Tồn SP tăng đúng SL | ☐ |
| E | NV quầy 2 | **POS** (kho quầy 2) → bán SP → thanh toán | Chốt đơn OK, không lỗi tồn | ☐ |

**Ghi nhận lỗi (nếu có):**

```
Ngày: ___________  NV: ___________  Thiết bị: ___________
Bước fail: ___________
Mô tả: _________________________________________________
```

---

## 16. Kịch bản E2E — Bán hàng chuẩn (1 ca)

| Bước | Thao tác | ☐ Pass |
|------|----------|--------|
| 1 | Đăng nhập App | ☐ |
| 2 | POS → chọn kho → **Mở ca** | ☐ |
| 3 | Tìm / quét SP → giỏ (2 SP) | ☐ |
| 4 | Gắn khách → **Thanh toán** | ☐ |
| 5 | Tiền mặt → **Chốt đơn** | ☐ |
| 6 | **In bill** → **Đơn mới** | ☐ |
| 7 | **Hôm nay** → thấy doanh thu ca tăng | ☐ |
| 8 | **Đóng ca** | ☐ |

---

## 17. Bảng tổng hợp parity (go-live)

| Nhóm | App đủ? | Ghi chú |
|------|---------|---------|
| Bán + thanh toán + in | ✅ | |
| Khách, chat, giữ hàng | ✅ | |
| Tra tồn đa kho | ✅ | P0 |
| Chuyển kho quầy–quầy | ✅ | P0 |
| Thu nợ, trả hàng, in lại | ✅ | |
| Ca làm việc | ✅ | Có FEFO khi `label_required` |
| Loyalty, đơn nháp nội bộ | ✅ | |
| Đơn nháp app khách | ✅ | Hub + deep link POS |
| Nhập hàng GRN (rút gọn) | ✅ | Cần `procurement.*` |
| Kiểm kê mobile | ✅ | Cần `inventory.write` |
| Deep link POS | ✅ | draft / nháp khách / giữ hàng |
| Hủy giữ hàng + ghi chú | ✅ | |
| GRN lưu nháp / hủy | ✅ | |

**Chữ ký UAT**

| Vai trò | Họ tên | Ngày | Đạt / Chưa đạt |
|---------|--------|------|----------------|
| NV quầy 1 | | | |
| NV quầy 2 | | | |
| Quản lý NT | | | |

---

*Cập nhật: P0 (tra tồn + chuyển kho) + P1 (loyalty, nháp, FEFO, hủy CK, GRN, đơn nháp app khách) + P2 (deep link POS, hủy giữ hàng, GRN nháp/hủy).*
