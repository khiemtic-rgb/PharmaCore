# Novixa — Website novixa.vn

> Chat title: **Novixa website — novixa.vn**
> Repo: `KitPlatform` / thư mục `novixa-site/`
> Deploy: Cloudflare Pages project **KitPlatform** (root `novixa-site`, output `dist`)

## LIVE

- https://novixa.vn/vi
- https://novixa.vn/vi/giai-phap — Founding Early Access + FAQ
- https://novixa.vn/vi/lien-he — Founding compact + form (ghi chú FOUNDING)
- https://novixa.vn/vi/thong-ke — Thống kê truy cập (mật khẩu `novixa2026`, không có trên menu)

## ĐÃ LÀM (chat trước — marketing + site)

### Nội dung & GTM (docs/marketing/)
- Sales deck, positioning, lead sequence, pricing (founding 299k/4 tháng), marketing plan, content calendar
- FAQ founding: không bảng giá đầy đủ → *"Bảng giá chi tiết sẽ được cập nhật sau giai đoạn founding"*
- Chưa publish full `/bang-gia`; founding block trên Giải pháp + Liên hệ

### Site (novixa-site/)
- `FoundingEarlyAccess.astro`, `FoundingFaq.astro`, `vi.json` (founding + foundingFaq)
- `CloudflareAnalytics.astro` — beacon nếu có `PUBLIC_CF_WEB_ANALYTICS_TOKEN` (Cloudflare Pages env thường không inject)
- **Thống kê:** `/vi/thong-ke` + `public/stats-snapshot.json`
- Mật khẩu: `src/lib/stats-config.ts` → `novixa2026`
- Script: `scripts/fetch-stats-snapshot.mjs` (GraphQL zone analytics)
- **Không** dùng query `?t=` khi fetch snapshot (Cloudflare trả HTML redirect)

### GitHub Actions
- `.github/workflows/novixa-update-stats.yml` — tên **Novixa update stats**
- Cần secret: **`CF_ANALYTICS_API_TOKEN`** (hoặc `CLOUDFLARE_API_TOKEN`) — token Cloudflare **Analytics Read**, zone novixa.vn
- `CF_ZONE_ID` tuỳ chọn (script tự tìm zone hoặc fallback `d1b5c7d5ca5caf06a967f492625bae24`)
- Chạy tay: Actions → Novixa update stats → Run workflow
- Lịch: mỗi 6 giờ; commit `stats-snapshot.json` → Cloudflare deploy

### Cloudflare Pages (KitPlatform)
- Biến env trên Pages **không reliable** cho Functions/build — stats dùng GHA, không phụ thuộc Pages env
- Web Analytics dashboard Cloudflare vẫn xem được (sidebar Analytics → Web analytics)

## COMMITS GẦN ĐÂY (main)

- Founding block + FAQ
- Cloudflare Web Analytics component
- `/vi/thong-ke` + Pages Function `/api/stats` (legacy, trang dùng snapshot JSON)
- Fix stats: build-time → GHA snapshot; fix fetch URL (no query string)

## TRẠNG THÁI TRAFFIC (ước lượng 24–30/6)

- ~70–150 visitor/ngày; spike T7–T2 có thể mix bot + content
- 7 ngày trong bảng stats: ~80–152 visitor/ngày; lượt xem > visitor → một phần đọc sâu
- **Chưa đo lead** từ stats — cần đếm form Liên hệ / Zalo / FOUNDING

## CHƯA LÀM / TUỲ CHỌN

- Dòng founding nhỏ dưới hero trang chủ (đã bàn, chưa implement)
- Top pages trong stats (GraphQL adaptive groups — đã bỏ vì plan/token)
- Commit `docs/marketing/*` lên repo
- Đổi mật khẩu stats trong `stats-config.ts` nếu cần
- Xóa biến thừa trên Cloudflare Pages (STATS_VIEW_KEY, …) — không cần nữa

## LOCAL

```powershell
cd novixa-site
npm install
npm run dev   # http://localhost:4321/vi
npm run build
```

## STARTER CHO CHAT MỚI

```
Đọc `.cursor/handoff/novixa-website.md` và tiếp tục công việc website novixa.vn.
Phạm vi: chỉ `novixa-site/`, deploy Cloudflare Pages, GHA stats — không KitPlatform API/admin.
```
