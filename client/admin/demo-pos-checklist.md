# Checklist demo POS — KitPlatform

Dùng trước khi demo đối tác hoặc sau mỗi đợt release lớn. Login: `admin` / `Admin@123`.

## Chuẩn bị

- [ ] PostgreSQL + API (`http://localhost:5290`) + Admin (`http://localhost:5173`) đang chạy
- [ ] `.\scripts\restart-api.ps1` nếu API treo hoặc build lỗi DLL locked
- [ ] Hard refresh trình duyệt (Ctrl+Shift+R)

## 1. Bán hàng cơ bản (batch mode: Gợi ý lô)

- [ ] Mở ca tại kho chính
- [ ] Quét `8934567890012` (Paracetamol 500mg) → thêm giỏ
- [ ] Đổi số lượng, thấy tồn / cảnh báo vượt tồn (nếu có)
- [ ] Thanh toán → chốt đơn → in hóa đơn (hoặc nút in lại)

## 2. Nháp → hoàn tất (1 API)

- [ ] Thêm SP → **Lưu nháp**
- [ ] Mở lại nháp từ danh sách đơn hoặc `?draftId=`
- [ ] Sửa giỏ / khách hàng → **Thanh toán** → hoàn tất **một lần** (không lỗi)

## 3. FEFO chuẩn (`label_required`)

- [ ] **Sales → Cài đặt** → **Nhãn lô — bắt buộc** → Lưu
- [ ] Thêm SP → chọn hoặc quét lô `LOT2026A` (demo seed)
- [ ] Thử chốt **không** chọn lô → bị chặn
- [ ] Chốt thành công có lô
- [ ] **Ca làm việc** → cảnh báo FEFO (nếu có vi phạm lô/HSD)

## 4. Quét GS1 nhãn lô (tùy chọn)

- [ ] Vẫn ở `label_optional` hoặc `label_required`
- [ ] Quét chuỗi dạng `(01)08934567890123(17)280631(10)LOT2026A` hoặc số lô thuần
- [ ] Lô gán đúng dòng giỏ

## 5. Hồi quy nhanh

- [ ] Đổi lại **Gợi ý lô** → không cảnh báo ca, bán vẫn OK
- [ ] Refresh trang — không màn đen, POS load < 10s (lần đầu)

## Ghi chú demo

| Mã demo | Mô tả |
|---------|--------|
| `8934567890012` | Barcode Paracetamol 500mg |
| `LOT2026A` | Số lô Paracetamol (seed) |
| `PARA500` | Mã sản phẩm |
