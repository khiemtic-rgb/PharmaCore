# Hướng dẫn nhanh — đăng tin Novixa

Mở: **https://novixa.vn/admin/**

## Đăng nhập

1. Bấm **Sign in with GitHub** (hoặc **Sign in with token** nếu IT chưa bật OAuth).
2. Dùng tài khoản GitHub đã được thêm vào team Novixa (quyền ghi repo).

## Đăng bài mới

1. Chọn **Tin tức** → **New**.
2. Điền:
   - **Tiêu đề**
   - **Mô tả ngắn** (1–2 câu)
   - **Ngày đăng** — để ngày tương lai nếu muốn lên lịch
   - **Nội dung** — dùng tiêu đề phụ `##`, danh sách `*`, in đậm `**chữ**`
3. Bấm **Publish** / Lưu.
4. Đợi 2–5 phút rồi kiểm tra https://novixa.vn/vi/tin-tuc/

## Ảnh đại diện

1. Trong CMS mở **Media**.
2. Upload file PNG/JPG.
3. **Đặt tên file trùng slug bài** — ví dụ bài slug `dao-tao-nhan-su` thì ảnh là `dao-tao-nhan-su.png`.
4. Khuyến nghị kích thước **1200 × 630** px.

Slug thường là tiêu đề không dấu, nối bằng dấu `-` (CMS tự tạo khi lưu).

## Sửa / xóa bài

Vào **Tin tức** → chọn bài → sửa nội dung → Lưu. Xóa chỉ khi chắc chắn.

## Lưu ý

- Sau khi lưu, website tự cập nhật qua Cloudflare — không cần nhờ IT deploy.
- Không sửa file ngoài mục Tin tức trong CMS.
- Gặp lỗi đăng nhập: liên hệ IT (invite GitHub / token / OAuth).
