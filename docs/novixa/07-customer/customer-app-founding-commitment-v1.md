# Novixa Customer App — Cam kết Founding Customer (L1–L3)

**Mã:** NVX-CS-10 · **Tier:** T1 (public-safe) · **Trạng thái:** Draft · **Version:** 1.0  
**Ngày:** 2026-07-09 · **Audience:** Sales, CS, chủ nhà thuốc founding

**Liên quan:** [customer-app-roadmap-p12-p18.md](./customer-app-roadmap-p12-p18.md) · [customer-app-phase-gates-v1.md](./customer-app-phase-gates-v1.md)

> Tài liệu **cam kết có thể nói với khách** trong giai đoạn founding (~7 tháng).  
> **Không** cam kết các mục trong [backlog P12–P18](./customer-app-backlog-p12-p18.md) cho đến khi gate tương ứng pass.

---

## 1. Cam kết ngắn gọn (elevator)

**Novixa cung cấp app khách hàng white-label** gắn POS nhà thuốc, gồm: đăng nhập OTP, nhắc uống thuốc, chat dược sĩ, tích điểm, đơn từ quầy (O2O), đặt trước, hồ sơ sức khỏe cơ bản — và **lộ trình mở rộng** đặt hàng online + đơn thuốc điện tử sau khi pilot ổn định.

---

## 2. Đã có sẵn hôm nay (P11a — L0)

Khách founding **dùng được ngay** sau onboarding tuần 3–4:

| Tính năng | Mô tả |
|---|---|
| App thương hiệu NT | Logo, màu, tên app theo cài đặt admin |
| Đăng nhập OTP | SĐT + mã OTP |
| Nhắc uống thuốc | Lịch uống, nhắc push (cần HTTPS + VAPID) |
| Tuân thủ điều trị | Đã uống / bỏ qua / nhắc sau |
| Nhắc mua lại | Gợi ý từ lịch sử mua tại quầy |
| Tích điểm & voucher | Đồng bộ POS |
| Chat dược sĩ | Tin nhắn hai chiều (đồng ý chat) |
| Đơn từ quầy (O2O) | DS gửi đơn → KH xác nhận trên app |
| Đặt trước sản phẩm | Lấy tại quầy hoặc giao hàng |
| Hồ sơ sức khỏe | Ghi chú, chỉ số, đính kèm file |
| Gia đình | Thêm người thân, nhắc thuốc theo người |
| AI hỗ trợ cơ bản | Gợi ý tham khảo — **không** thay tư vấn dược sĩ |
| Song ngữ app | Tiếng Việt / English (giao diện) |

---

## 3. Cam kết đang triển khai (P11b — L1) — ~6 tuần

| Cam kết | Điều kiện |
|---|---|
| OTP SMS **thật** trên production | NT cung cấp gateway hoặc dùng gateway Novixa |
| Push nhắc thuốc ổn định production | HTTPS + VAPID |
| Hỗ trợ hypercare 2 tuần sau bật app | Theo [go-live checklist](./go-live-checklist-customer-v1.md) |

**Không cam kết trong P11b:** giỏ hàng tự do, quét đơn AI, app iOS/Android store.

---

## 4. Cam kết lộ trình founding (sau G1 — ~7 tháng tới L3)

*Thứ tự nội bộ: P15 → P12 → P13. Ngày cụ thể phụ thuộc gate pilot.*

| Giai đoạn | Khách nhận được | Maturity |
|---|---|---|
| **Gia đình nâng cao** | Người chăm sóc đăng nhập app riêng; xác nhận uống thuốc thay; báo cáo tuân thủ | L2 |
| **Đặt hàng online** | Tìm sản phẩm, giỏ hàng, đặt OTC/TPCN; giao hoặc lấy quầy | L3 |
| **Đơn kê đơn** | Gửi ảnh đơn → dược sĩ duyệt → đặt hàng | L3 |
| **Đơn điện tử** | Lưu đơn có cấu trúc; nhắc tự động từ đơn; mua lại nhanh | L3 |

**Founding customer được ưu tiên** ảnh hưởng UX trước khi GA các tính năng trên.

---

## 5. Lộ trình — không cam kết ngày founding (L4–L5)

Nói là **roadmap**, không hợp đồng cứng:

| Tính năng | Phase | Ghi chú sales |
|---|---|---|
| AI dược nâng cao (LLM) | P14 | Sau đơn điện tử ổn định |
| Đánh giá dịch vụ, khảo sát | P16 | |
| Trung tâm kiến thức sức khỏe | P16 | |
| App iOS / Android store | P17 | PWA đủ dùng trước đó |
| Thanh toán ví / thẻ online | P17 | COD/QR trước (P12) |
| Cộng đồng, đánh giá sản phẩm | P18 | |

Chi tiết kỹ thuật: [customer-app-backlog-p12-p18.md](./customer-app-backlog-p12-p18.md)

---

## 6. Điều kiện phía nhà thuốc

Founding customer cam kết:

- [ ] Chỉ định 1 người phụ trách app + 1 DS quầy dùng O2O/chat
- [ ] ≥50 khách có SĐT sạch để mời dùng app (hoặc import CRM)
- [ ] HTTPS domain app (hoặc subdomain Novixa)
- [ ] Tham gia UAT 6 kịch bản khi bật production
- [ ] Phản hồi retro 2 tuần / 1 tháng trong 3 tháng đầu

---

## 7. Câu trả lời nhanh (FAQ sales)

| Câu hỏi | Trả lời |
|---|---|
| Có giống app Long Châu/Pharmacity? | Khác: app **của nhà thuốc bạn**, gắn POS Novixa; không marketplace chuỗi |
| Có đặt thuốc online ngay? | OTC/TPCN **theo lộ trình L3**; hiện đặt trước + đơn DS gửi |
| Có quét đơn AI? | Roadmap P13; founding có upload ảnh + DS duyệt trước |
| AI có thay bác sĩ? | **Không** — chỉ hỗ trợ, luôn có disclaimer |
| Có app trên App Store? | Roadmap P17; trước đó dùng PWA (Add to Home Screen) |

---

**Changelog**

| Version | Ngày | Thay đổi |
|---|---|---|
| 1.0 | 2026-07-09 | Khởi tạo cam kết L1–L3 founding |
