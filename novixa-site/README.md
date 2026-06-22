# Novixa — Website giới thiệu

Site marketing **tách biệt** khỏi lõi ERP PharmaCore (`client/admin`, `src/PharmaCore.*`).

- **Domain dự kiến:** [novixa.vn](https://novixa.vn)
- **Ngôn ngữ:** Tiếng Việt (`/vi/…`). Khung i18n sẵn; **English chưa publish**.
- **Tin tức:** Markdown trong `src/content/tin-tuc/`

## Chạy local

```powershell
cd novixa-site
npm install
npm run dev
```

Mở http://localhost:4321 → redirect `/vi`.

## Build

```powershell
npm run build
npm run preview
```

## Deploy (miễn phí)

### Cloudflare Pages / Vercel

1. Push repo lên GitHub (monorepo: root = `novixa-site` hoặc repo riêng).
2. Import project → **Root directory:** `novixa-site`
3. Build: `npm run build` — Output: `dist`
4. Gán domain `novixa.vn` / `www.novixa.vn` trong DNS.

**Không** deploy chung với PharmaCore API.

## Cấu trúc

```
novixa-site/
  src/
    content/tin-tuc/     # Bài viết (.md)
    i18n/vi.json         # Chuỗi UI tiếng Việt
    i18n/en.json         # Skeleton EN (chưa dùng route)
    pages/vi/            # Trang công khai
```

## Thêm tin tức

Tạo file `src/content/tin-tuc/ten-bai.md`:

```markdown
---
title: "Tiêu đề"
description: "Mô tả ngắn"
pubDate: 2026-06-20
lang: vi
---

Nội dung...
```

## Bảo mật

- Site **tĩnh** — không kết nối PostgreSQL / API ERP.
- Form liên hệ: `mailto:khiemtic@gmail.com` (có thể thay Formspree sau).
- ERP demo sau này: `app.novixa.vn` (VPS riêng).

## Liên quan PharmaCore

Trong repo ERP, module **Sales/POS** tạm **freeze feature mới** đến khi site v1 live — xem `README.md` gốc mục *Development freeze*.
