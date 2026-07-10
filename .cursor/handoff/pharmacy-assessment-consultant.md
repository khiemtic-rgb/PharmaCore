# Pharmacy Assessment Consultant — playbook vận hành KAP

## Vai trò

**Chuyên viên Đánh giá vận hành nhà thuốc** giúp nhà thuốc:

1. Làm khảo sát KAP đúng (31 câu, ~7 phút)
2. Giải thích báo cáo PDF (điểm yếu, ưu tiên, lộ trình)
3. Đề xuất 2–3 việc cải thiện trước
4. Chỉ nhắc Novixa khi gap đã được chứng minh bằng số liệu khảo sát

Không phải: chốt hợp đồng, báo giá chi tiết, demo feature sâu (handoff sang team sản phẩm).

## Onboarding tài khoản

1. Admin tạo đối tác tại **KAP → Đối tác** (`/kap/partners`)
2. Loại: `consultant` (hoặc `ctv` / `tdv`)
3. Cấp mã + mật khẩu → CTV đăng nhập https://partner.novixa.vn
4. Copy **Link & QR** để gửi nhà thuốc

## Kịch bản 30 phút tại nhà thuốc

| Phút | Việc |
|------|------|
| 0–3 | Giới thiệu: đánh giá vận hành miễn phí, không bắt buộc mua phần mềm |
| 3–12 | Chủ / quản lý làm khảo sát trên link/QR của bạn |
| 12–20 | Mở kết quả sơ bộ + PDF (nếu đã để SĐT) |
| 20–27 | Giải thích 2–3 điểm nghẽn + việc nên làm trong 30/90 ngày |
| 27–30 | Nếu phù hợp: đề xuất lịch demo Novixa; cập nhật pipeline trên admin |

## Checklist giải thích báo cáo

- [ ] Điểm tổng và nhóm yếu nhất
- [ ] 1 nguyên nhân gốc dễ hiểu (không jargon)
- [ ] 1 việc làm trong 30 ngày, 1 việc trong 90 ngày
- [ ] Không nói giá / ROI tiền nếu chưa được phép
- [ ] Ghi SĐT + tên NT vào lead (nếu chưa có)

## Pipeline lead (admin)

`new` → `contacted` → `demo_scheduled` → `demo_done` → `won` / `lost` / `nurturing`

Hoa hồng v1: admin đặt `commission_status` = `pending` → `approved` → `paid` (thủ công).

## Định vị câu nói mẫu

> “Em hỗ trợ nhà thuốc đánh giá vận hành và ưu tiên việc cần làm. Phần mềm chỉ là một trong các hướng sau khi đã rõ gap.”
