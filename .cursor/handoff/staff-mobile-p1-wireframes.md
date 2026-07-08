# Staff Mobile P1 — Wireframes (Novixa)

> **Nguyên tắc thiết kế:** Mỗi màn một việc chính. Thông tin đủ quyết định tại quầy, không sao chép layout desktop hay app đối thủ.  
> **Sprint 1:** Đăng nhập → POS → Thanh toán → In bill (+ mở ca).  
> **Sprint 1b (tiếp):** Hub, Khách + OTP, Chat.

**URL đề xuất:** `pos.novixa.vn` (PWA staff) · **API:** dùng chung `api.novixa.vn` (JWT admin).

---

## Luồng tổng thể

```text
[Đăng nhập] → [POS — bán hàng] ⇄ [Thanh toán] → [In bill] → [POS mới]
                    ↑
              [Mở ca] (nếu chưa có ca)
```

Hub (Sprint 1b): POS · Khách · Chat · Hôm nay · Tài khoản

---

## Màn 1 — Đăng nhập

**Mục đích:** Xác định nhà thuốc + nhân viên. Nhớ tenant trên máy.

```text
┌─────────────────────────────┐
│         Novixa              │
│      Quầy bán hàng          │
├─────────────────────────────┤
│ Mã nhà thuốc                │
│ [ NT_XUANHOA            ]   │
│                             │
│ Tên đăng nhập               │
│ [ admin                 ]   │
│                             │
│ Mật khẩu                    │
│ [ ••••••••              ]   │
│                             │
│ [      Đăng nhập        ]   │
└─────────────────────────────┘
```

| Thành phần | Hành vi |
|---|---|
| Mã NT | Lưu localStorage, tự điền lần sau |
| Lỗi | Toast đỏ, không chuyển màn |
| Thành công | → POS (hoặc Hub nếu có) |

**Không có:** quên mật khẩu (admin desktop), đăng ký.

---

## Màn 2 — POS (màn chính, 90% thời gian)

**Mục đích:** Tìm thuốc → thêm giỏ → xem tổng → sang thanh toán.

```text
┌─────────────────────────────┐
│ NT_XUANHOA · Chi nhánh A  ▾│  ← tap: đổi kho/CN (nếu >1)
│ Ca #12 · đang mở            │  ← tap: xem ca / mở ca
├─────────────────────────────┤
│ 🔍 Tìm tên, mã SP, SKU...   │
├─────────────────────────────┤
│ (kết quả tìm — chỉ khi gõ)  │
│ Vitamin D3 1000IU           │
│ PVN4199 · 150.000 · Tồn 6   │
│ ─────────────────────────── │
│ Albumin VPC                 │
│ PVN4201 · 50.000 · Tồn 21   │
├─────────────────────────────┤
│ Giỏ (2)                     │
│ ┌─────────────────────────┐ │
│ │ Vitamin D3 1000IU       │ │
│ │ PVN4199 · 150.000       │ │
│ │ Lô: L0125 (FEFO)    [▾] │ │  ← chỉ khi batch mode bật
│ │    [ − ]  1  [ + ]  [×] │ │
│ └─────────────────────────┘ │
│ ┌─────────────────────────┐ │
│ │ Benfuca                 │ │
│ │ ...                     │ │
│ └─────────────────────────┘ │
├─────────────────────────────┤
│ Khách: [ + Chọn khách ]     │  ← optional, 1 dòng
├─────────────────────────────┤
│ Tạm tính      165.000 đ     │  ← sticky footer
│ [        Thanh toán       ] │
└─────────────────────────────┘
```

| Thành phần | Thông tin hiển thị | Ẩn / gọn |
|---|---|---|
| Header | Tenant, chi nhánh, trạng thái ca | Không menu 9 module |
| Tìm kiếm | Gõ ≥2 ký tự → list 8 SP | Không quét mã (P2) |
| Dòng SP kết quả | Tên, mã, giá, **tồn** | Không ảnh (P1) — thêm P2 nếu cần |
| Dòng giỏ | Tên, mã, giá, SL, lô | Không chiết khấu dòng (P2) |
| Khách | Tên hoặc nút chọn | Không form dài |
| Footer | **1 số tổng** + 1 nút primary | Không “Lưu tạm” P1 nếu chưa kịp |

**Trạng thái đặc biệt:**

```text
Chưa mở ca:
┌─────────────────────────────┐
│ ⚠ Chưa mở ca bán hàng       │
│ [ Mở ca ngay ]              │
└─────────────────────────────┘
(Giỏ vẫn thêm được; chặn ở Thanh toán)

Giỏ trống:
Footer: nút Thanh toán disabled
```

---

## Màn 2b — Sheet «Mở ca»

```text
┌─────────────────────────────┐
│ Mở ca bán hàng              │
│ Tiền mặt đầu ca             │
│ [ 0                     ] đ   │
│ [ Hủy ]    [ Mở ca ]        │
└─────────────────────────────┘
```

---

## Màn 2c — Sheet «Chọn khách» (optional)

```text
┌─────────────────────────────┐
│ Khách hàng              [×] │
│ 🔍 SĐT hoặc tên             │
│ ─────────────────────────── │
│ Trần Văn A · 0984...        │
│ Lê Thị B · 0912...          │
│ ─────────────────────────── │
│ [ Bán không chọn KH ]       │
└─────────────────────────────┘
```

---

## Màn 2d — Sheet «Chọn lô» (khi batch mode)

```text
┌─────────────────────────────┐
│ Chọn lô · Vitamin D3    [×] │
│ ● L0125 · HSD 12/2026 · 6   │  ← FEFO gợi ý
│ ○ L0099 · HSD 06/2026 · 2   │
│ [ Xác nhận ]                │
└─────────────────────────────┘
```

---

## Màn 3 — Thanh toán

**Mục đích:** Chốt tiền — ít lựa chọn, mặc định thông minh.

```text
┌─────────────────────────────┐
│ ← Thanh toán                │
├─────────────────────────────┤
│        165.000 đ            │  ← số to, 1 lần
│ 2 sản phẩm                  │
├─────────────────────────────┤
│ Khách: Trần Văn A      [Đổi]│
├─────────────────────────────┤
│ Hình thức                   │
│ (•) Tiền mặt                │
│ ( ) Chuyển khoản            │
│ ( ) Ghi nợ *                │  ← chỉ nếu có KH + quyền
│     * cần chọn khách        │
├─────────────────────────────┤
│ Tiền khách đưa (mặt)        │
│ [ 200000              ]     │  ← optional, hiện tiền thừa
│ Thối: 35.000 đ              │
├─────────────────────────────┤
│ [    Hoàn tất & in bill   ] │
└─────────────────────────────┘
```

| Quy tắc | |
|---|---|
| Mặc định | Tiền mặt, khách đưa = đúng tổng |
| Ghi nợ | Chỉ khi đã chọn KH có allowCredit |
| Không P1 | Voucher, điểm, chia nhiều hình thức |

**Loading:** nút disabled + “Đang lưu…”

---

## Màn 4 — In bill (sau bán thành công)

**Mục đích:** In nhiệt 80mm trên phone — **full màn**, không popup.

```text
┌─────────────────────────────┐
│ ✓ Đã bán · HD000123         │
├─────────────────────────────┤
│ ┌─ preview bill 80mm ─────┐ │
│ │ NHÀ THUỐC XUÂN HÒA      │ │
│ │ ...                     │ │
│ │ TỔNG: 165.000           │ │
│ └─────────────────────────┘ │
├─────────────────────────────┤
│ [      🖨 In bill         ] │  → window.print() / share
│ [      Đơn mới            ] │  → về POS, giỏ trống
└─────────────────────────────┘
```

| In trên phone | |
|---|---|
| Android | Chrome → In → máy BT |
| iPhone | Safari → In → AirPrint / app hãng |
| Fallback | “Chia sẻ PDF” nếu in fail |

---

## Màn 5 — Hub (Sprint 1b, tham chiếu)

```text
┌─────────────────────────────┐
│ Xuan Hoa · Hiền             │
├─────────────────────────────┤
│ [ 🛒 Bán hàng          → ]  │  ← POS
│ [ 👥 Khách + OTP       → ]  │
│ [ 💬 Chat (3)          → ]  │
│ [ 📊 Hôm nay           → ]  │  ← doanh thu ca + số đơn
├─────────────────────────────┤
│ Kho · báo cáo · cấu hình    │
│ → dùng admin trên máy tính  │
│ [ Đăng xuất ]               │
└─────────────────────────────┘
```

---

## Ma trận màn × Sprint

| Màn | Sprint 1 | Sprint 1b |
|---|---|---|
| Đăng nhập | ✓ | |
| POS + mở ca | ✓ | |
| Thanh toán | ✓ | |
| In bill | ✓ | |
| Hub | | ✓ |
| Khách + OTP | | ✓ |
| Chat | | ✓ |
| Hôm nay (KPI) | | ✓ |

---

## Khác biệt cố ý vs desktop admin

| Desktop | Staff mobile |
|---|---|
| 3 cột POS | 1 cột: tìm → giỏ → footer |
| Bảng 20 cột | Card + 4 field/dòng |
| Popup in | Màn in full |
| Sidebar 9 module | Hub 4–5 mục |
| Mọi chiết khấu | Tiền mặt/CK/ghi nợ trước |

---

## Kỹ thuật (Sprint 1)

- App: `client/staff-app` · port dev `5175`
- API: tái dùng `/api/sales/*`, `/api/inventory/warehouses`, `/api/auth/*`
- Logic: `pos-pricing`, `pos-sale-payload`, batch mode (copy từ admin)
- In: HTML 80mm + `window.print()` trên màn Receipt
