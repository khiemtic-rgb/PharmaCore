# Checklist demo Customer App — KitPlatform

Kiểm tra app khách trước pilot hoặc demo O2O. Chạy song song Admin (`5173`) + API (`5290`) + Customer App (`5174`).

**Liên quan:**
- [customer-app-phase-gates-v1.md](../../docs/novixa/07-customer/customer-app-phase-gates-v1.md) — UAT production (G1.4)
- [customer-app-roadmap-p12-p18.md](../../docs/novixa/07-customer/customer-app-roadmap-p12-p18.md)
- Handoff P11b: `.cursor/handoff/customer-app-p11b.md`
- Admin [POS](../admin/demo-pos-checklist.md) · [Mua hàng](../admin/demo-procurement-checklist.md)

## Chuẩn bị

- [ ] `.\run-dev.bat` hoặc API + `.\run-customer-app.bat`
- [ ] Customer App: http://localhost:5174
- [ ] Admin: http://localhost:5173 (`admin` / `Admin@123`)
- [ ] Hard refresh / xóa cache PWA nếu test push

## Thông tin demo

| Mục | Giá trị |
|-----|---------|
| Tenant | `DEMO_PHARMACY` |
| SĐT | `0909123456` (Trần Thị Mai) |
| OTP (Development) | `000000` |
| SP gợi ý nhắc thuốc | Tra catalog API (vd. Paracetamol) |

---

## 1. Đăng nhập OTP

- [ ] Màn login — nhập SĐT `0909123456`, tenant `DEMO_PHARMACY`
- [ ] Nhận OTP (dev: `000000`) → vào **Trang chủ**
- [ ] Deep link `/login?tenant=DEMO_PHARMACY` hoạt động
- [ ] Đăng xuất → đăng nhập lại (session ổn)

## 2. Trang chủ

- [ ] Tóm tắt điểm thưởng, nhắc thuốc, adherence
- [ ] Shortcut: Sức khỏe, Nhắc thuốc, Đặt trước, AI, Gia đình, Điểm, Chat
- [ ] Bottom nav: Trang chủ / **Đơn hàng** / Nhắc thuốc / Chat / Tài khoản

## 3. Đơn hàng (`/orders`)

- [ ] Tab **Đặt** — draft orders từ quầy; xác nhận / ẩn
- [ ] Tab **Đã mua** — lịch sử; chi tiết thanh toán
- [ ] Tab **Đặt trước** — danh sách reservation

## 4. Nhắc thuốc (`/reminders`)

- [ ] Danh sách nhắc — bật/tắt toggle
- [ ] **Thêm nhắc** — tra SP qua catalog API
- [ ] Panel **Đến giờ uống** — Đã uống / Bỏ qua / Nhắc sau
- [ ] **Gợi ý mua lại** — chấp nhận / bỏ qua / snooze
- [ ] Cảnh báo bỏ liều (nếu streak ≥ ngưỡng)

## 5. Chat (`/chat`)

- [ ] Consent chat — bật đồng ý
- [ ] Gửi / nhận tin (SSE hoặc refresh)
- [ ] Badge chưa đọc trên tab Chat

## 6. Tích điểm (`/loyalty`)

- [ ] Số dư, tier, lịch sử giao dịch
- [ ] Danh sách voucher
- [ ] *(Admin)* Bán POS gắn khách → điểm cập nhật sau refresh

## 7. Tài khoản (`/profile`)

- [ ] Họ tên, SĐT
- [ ] Đồng ý CDP (SMS / push nhắc chăm sóc)
- [ ] Bật **Thông báo push** (cần VAPID)
- [ ] Đổi ngôn ngữ EN → UI đổi; refresh giữ locale
- [ ] Menu: Sức khỏe, Gia đình, Thuốc của tôi, Nhà thuốc, AI, Công nợ, Địa chỉ, Thông báo

## 8. Hồ sơ sức khỏe (`/health`)

- [ ] Thêm hồ sơ (đơn thuốc, khám, xét nghiệm…)
- [ ] Thêm chỉ số (BMI, HA, đường huyết)
- [ ] Nhắc tái khám — tạo / đánh dấu xong
- [ ] Upload đính kèm ≤5MB

## 9. Gia đình (`/family`)

- [ ] Thêm / sửa thành viên
- [ ] Bật thông báo người chăm sóc
- [ ] Nhắc thuốc gắn `familyMemberId`

## 10. Thuốc của tôi (`/medications`)

- [ ] Danh sách thuốc đang dùng
- [ ] Ngày còn lại / gợi ý mua lại
- [ ] Timeline sự kiện

## 11. Nhà thuốc (`/pharmacy`)

- [ ] Branding tenant, điểm, voucher
- [ ] Liên kết đặt trước, chat, gọi hỗ trợ

## 12. AI (`/ai`)

- [ ] Gửi câu hỏi; disclaimer hiển thị
- [ ] Gợi ý chat dược sĩ khi cần

## 13. Đặt trước (`/reservations`)

- [ ] Tạo đặt trước — tìm SP, số lượng
- [ ] Lấy tại quầy / giao tận nơi + địa chỉ
- [ ] Hủy đặt trước pending

## 14. Địa chỉ & công nợ

- [ ] `/addresses` — CRUD địa chỉ giao hàng
- [ ] `/receivables` — công nợ khớp POS (nếu có seed)

## 15. Thông báo (`/notifications`)

- [ ] Inbox server-side; đánh dấu đã đọc

## 16. Liên thông Admin

- [ ] Draft order: POS gửi → app `/orders` → POS nạp giỏ → hoàn tất
- [ ] Reservation: app tạo → admin duyệt → sẵn sàng → thu POS
- [ ] Chat: admin badge + trả lời
- [ ] Branding: admin **App khách** cập nhật logo/màu

## 17. Hồi quy & PWA

- [ ] Refresh — không màn trắng
- [ ] Mobile / Add to Home Screen — layout ổn
- [ ] API tắt → `ApiHealthBanner` báo lỗi
- [ ] `AppErrorBoundary` — lỗi runtime có thông báo

---

## UAT production (G1.4)

Trên NT pilot production: tick cùng bảng [phase gates G1.4](../../docs/novixa/07-customer/customer-app-phase-gates-v1.md#g14--uat-p11a-6-kịch-bản--nt).

*Các mục `/shop`, giỏ hàng, e-Rx OCR — backlog P12–P13, chưa trong checklist này.*
