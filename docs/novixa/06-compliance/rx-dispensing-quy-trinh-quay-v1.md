# Quy trình quầy — Bán thuốc kê đơn có đơn bác sĩ (Novixa)

**Mã:** NVX-CPL-02 · **Tier:** T1 · **Version:** 1.1 · **Ngày:** 2026-07-10  
**Áp dụng:** Pilot `NT_XUANHOA` — chế độ **strict**

---

## Nguyên tắc

1. **Thuốc không kê đơn (OTC):** bán trên máy như bình thường.  
2. **Thuốc kê đơn:** chỉ bán khi có **đơn bác sĩ đã xác nhận** trên Novixa → **in phiếu**.  
3. **Nhân viên được nhập đơn và gửi duyệt ngay; ảnh đơn bắt buộc trước khi quản lý/dược Verify.**  
4. **Không bán Rx “ngoài máy”** — tiền phải khớp doanh thu trên hệ thống.

---

## Ai làm gì?

| Việc | Nhân viên | Người có quyền Verify* |
|------|-----------|---------------------------|
| Gọi bác sĩ, nhận ảnh đơn | ✓ | ✓ |
| Nhập đơn vào Novixa | ✓ | ✓ |
| **Xác nhận đơn (Verify)** | ✗ (mặc định) | ✓ |
| Bán trên POS theo đơn | ✓ | ✓ |
| Đối tiền cuối ngày | | ✓ (quản lý / chủ) |

\* **Verify cấu hình theo vai trò** (System → Vai trò): quầy lẻ thường là dược/chủ; **chuỗi** thường giao **quản lý chi nhánh**, không bắt chủ verify từng đơn.

---

## Cách A — Bác sĩ không dùng máy (gọi điện / Zalo)

```
Khách cần thuốc kê đơn
    ↓
NV gọi BS (số trong Novixa → Bác sĩ liên kết)
    ↓
NV: Admin/POS → Tạo đơn mới (hoặc POS "Tạo đơn nhanh")
    • Chọn bác sĩ
    • Chọn / nhập khách
    • Nhập thuốc (Rx + OTC nếu BS dặn thêm)
    ↓
NV bấm Gửi duyệt — chưa cần ảnh; khách có thể không chờ
    ↓
(NV nhận ảnh Zalo từ BS → đính kèm vào đơn)
    ↓
Quản lý / Dược bấm Xác nhận (Verify)
    • Máy kiểm tra: phải có ảnh đơn
    • Ghi: đã gọi / Zalo / gặp trực tiếp
    ↓
POS → Bán theo đơn BS → In phiếu (1 tờ, có dòng Rx và OTC)
    ↓
Thu tiền khách — xong
```

**Lưu ý:** Đơn có hiệu lực **7 ngày** kể từ lúc xác nhận. Quá hạn phải nhờ bác sĩ kê lại.

---

## Cách B — Bác sĩ kê trên Novixa (portal)

```
BS đăng nhập portal → Kê đơn → Gửi
    ↓
Quầy: Admin → Đơn thuốc BS → thấy đơn mới (Đã ký)
    ↓
Dược soi (nếu cần) → POS Bán theo đơn → In phiếu
```

---

## Khi máy báo “Không bán được — cần đơn bác sỹ”

| Nguyên nhân | Xử lý |
|-------------|--------|
| Thuốc là **kê đơn**, chưa chọn đơn BS | Làm Cách A hoặc B trước |
| Đơn chưa Verify | Nhờ quản lý/dược xác nhận (phải có ảnh đơn) |
| Verify bị chặn “thiếu ảnh” | Đính kèm ảnh Zalo/ giấy rồi Verify lại |
| Đơn **hết hạn** (> 7 ngày) | Gọi BS kê đơn mới |
| Đơn đã bán hết | Tạo đơn mới nếu khách cần tiếp |

---

## Cuối ngày (chủ quầy)

1. Báo cáo Novixa: doanh thu theo **bác sĩ** và **nhân viên bán**.  
2. Đếm tiền mặt = doanh thu máy (± phiếu thu/chi có lý do).  
3. **Không có** thuốc kê đơn bán tay không phiếu.

---

## Liên hệ hỗ trợ Novixa

Lỗi hệ thống / không in được phiếu sau khi đã có đơn verified → ghi nhận màn hình + gọi hỗ trợ triển khai.

---

*In dán tại quầy · Cập nhật theo rx-prescription-module-v1.md*
