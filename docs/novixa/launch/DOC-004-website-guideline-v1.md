# Novixa — Website Guideline V1 (Founding Mode)

**Mã:** DOC-004 · **Tier:** T2/T3 · **Trạng thái:** Draft · **Version:** 1.0  
**Phạm vi:** `novixa.vn` · giai đoạn **Founding 2026** — chưa Scale (full pricing catalog)

> **Live site:** `novixa-site/` · Deploy: Cloudflare Pages · Handoff: `.cursor/handoff/novixa-website.md`  
> **Copy canonical T0:** `novixa-site/src/i18n/vi.json`

---

## 1. Mục đích

Chuẩn hóa website marketing **trong giai đoạn founding** để:

- Nhất quán với sales deck và founding terms
- **Không over-promise** (AI, Pricing full, Platform subpages chưa build)
- SEO và content có CTA rõ về **demo / FOUNDING**

**Hai mode:**

| Mode | Thời gian | Khác biệt chính |
|------|-----------|-----------------|
| **Founding** *(file này)* | Q3/2026 – Q1/2027 | Founding block, không bảng giá đầy đủ |
| **Scale** *(Planned)* | 2027+ | Pricing page, EN site, Platform subpages |

---

## 2. Sitemap — Founding (thực tế + cho phép)

### 2.1 Đã live ✅

| URL | Trang | Mục đích |
|-----|-------|----------|
| `/vi` | Trang chủ | Hero, features, tin mới, trust |
| `/vi/giai-phap` | Giải pháp | Module blocks + **Founding Early Access** + FAQ |
| `/vi/ve-chung-toi` | Về Novixa | Brand story |
| `/vi/lien-he` | Liên hệ | Form + founding compact |
| `/vi/tin-tuc` | Tin tức index | SEO hub |
| `/vi/tin-tuc/[slug]` | Bài viết | SEO long-tail |
| `/vi/thong-ke` | Thống kê | Nội bộ — **không** trên menu |

| URL | Ghi chú |
|-----|---------|
| `/` | Redirect → `/vi` |

### 2.2 Chưa publish — không link từ nav founding ❌

| URL (Scale plan) | Lý do defer |
|------------------|-------------|
| `/vi/pricing` | Chưa public catalog — founding 299k trên giai-phap |
| `/vi/platform/*` | Chưa có trang con riêng — nội dung gộp `/vi/giai-phap` |
| `/vi/ai` | Chỉ mention roadmap trên giai-phap |
| `/en/*` | EN — sắp có (nav label hiện tại) |

### 2.3 Sitemap diagram (Founding)

```
novixa.vn
└── /vi
    ├── /                    Trang chủ
    ├── /giai-phap           Giải pháp + Founding + FAQ  ← conversion chính
    ├── /ve-chung-toi        Về
    ├── /lien-he             Liên hệ / FOUNDING
    └── /tin-tuc
        └── /[slug]          Blog SEO
```

---

## 3. Chuẩn Landing Page

Áp dụng cho **Trang chủ**, **Giải pháp**, và **landing campaign** (nếu có).

| Block | Nội dung | Founding |
|-------|----------|----------|
| **Hero** | Headline ERP nhà thuốc · sub pain | CTA: Đăng ký quan tâm / Xem giải pháp |
| **Pain** | Excel/POS/lô/HSD (implicit trong features) | Không fear-mongering |
| **Solution** | 4–5 module cards (POS, Kho, CRM, Báo cáo, AI roadmap) | AI = “lộ trình 2026” |
| **Benefits** | FEFO, một nguồn dữ liệu, GPP tinh thần | |
| **Founding** | 299k×4, timeline, bullets | **Bắt buộc** trên `/giai-phap` + compact `/lien-he` |
| **FAQ** | foundingFaq trong vi.json | Sync với [founding-program-terms](../04-gtm/founding-program-terms-v1.md) |
| **CTA** | Form liên hệ · ghi **FOUNDING** | Primary conversion |
| **Trust** | Dược sĩ / GPP / VN | Chưa case study → không fake logo khách |

**Không có block Pricing table** trong founding mode.

---

## 4. Chuẩn trang Giải pháp (`/vi/giai-phap`)

### 4.1 Module cards (map product truth)

| Card web | Product thật | Label |
|----------|---------------|-------|
| Bán hàng (POS) | Admin sales + staff app | ✅ |
| Kho & lô (FEFO) | Inventory batches | ✅ |
| Khách hàng (CRM) | Customer module + app | ✅ |
| Báo cáo & vận hành | Reports Wave 1 | ✅ |
| Trợ lý AI | Rule-based / roadmap | **Lộ trình** |

### 4.2 Founding section

Copy từ `vi.json` keys: `founding`, `foundingFaq` — **single source** cho web; legal detail trong GTM-08.

---

## 5. Chuẩn Blog (`/vi/tin-tuc`)

### 5.1 Mục tiêu SEO founding

Chủ đề ưu tiên (DOC-007 aligned — **1 bài/tuần** founding):

- GPP vận hành · quản lý kho · FEFO · HSD
- Chuyển đổi số nhà thuốc · Excel vs ERP
- O2O / loyalty *(không hype AI)*

### 5.2 Cấu trúc bài

| Thành phần | Chuẩn |
|------------|--------|
| **Tiêu đề** | 50–65 ký tự · keyword chính đầu dòng |
| **Meta description** | 150–160 ký tự · CTA mềm |
| **H1** | 1 per page |
| **H2/H3** | Scan-friendly |
| **CTA cuối bài** | Link `/vi/giai-phap` hoặc `/vi/lien-he` |
| **Internal link** | ≥ 2 link nội bộ (giai-phap, bài liên quan) |
| **Ngày publish** | `publishDate` — không hiện bài tương lai |

### 5.3 Guardrails nội dung

| Được | Không |
|------|-------|
| “Hỗ trợ vận hành theo tinh thần GPP” | “Đạt GPP cert” |
| “Lộ trình AI 2026” | “AI thay dược sĩ” |
| “Founding 299k×4” | Bảng giá Core/Growth/Chain đầy đủ |
| “Tra cứu thuốc tham khảo” | “Kết nối CSDL Dược QG” |

---

## 6. Navigation & Footer

### 6.1 Nav (founding)

`Trang chủ · Giải pháp · Về Novixa · Tin tức · Liên hệ`

- **Không** thêm Pricing, Platform, AI top-level
- EN: “sắp có” — không link 404

### 6.2 Footer

- Email / contact
- © Novixa
- Không link `/vi/thong-ke` (internal stats)

---

## 7. Form liên hệ

- Ghi chú: ghi **“FOUNDING”** trong tin nhắn để ưu tiên
- Route lead → Sales qualify checklist
- Không hứa phản hồi SLA chưa có (NVX-OPS-05)

---

## 8. Kỹ thuật & deploy

| Hạng mục | Giá trị |
|----------|---------|
| Repo | `novixa-site/` |
| Build | `npm run build` → `dist/` |
| Host | Cloudflare Pages (project `pharmacore`) |
| i18n | `src/i18n/vi.json` |
| Stats nội bộ | `/vi/thong-ke` + GHA `novixa-update-stats.yml` |
| Analytics | Cloudflare Web Analytics (dashboard) |

**Tách biệt ERP:** website **không** gọi API PharmaCore production.

---

## 9. Checklist trước publish thay đổi web

- [ ] Copy sync `vi.json` ↔ founding terms / FAQ sales
- [ ] Không link trang chưa build
- [ ] AI / Pricing wording đúng guardrails (mục 5.3)
- [ ] CTA trỏ đúng `/vi/lien-he` hoặc `#contact-form`
- [ ] Build local OK · preview Cloudflare
- [ ] Không embed pricing nội bộ T3

---

## 10. Lộ trình chuyển Scale mode (2027)

Khi ≥3 case study + catalog giá public:

1. Thêm `/vi/pricing` — table Core/Growth/Chain
2. Tách `/vi/platform/*` hoặc giữ single giai-phap (A/B)
3. `/en` skeleton
4. Resources / docs T0 subset
5. Cập nhật DOC-004 → v2 Scale

---

## Tham chiếu

- [DOC Master Index](../DOC-MASTER-INDEX.md)
- [ICP & Pricing](../04-gtm/icp-positioning-pricing-v1.md)
- [Sales deck](./DOC-008/sales-deck-v1.md)
- [Module catalog](../02-product/module-catalog-v1.md)

---

*Owner: Marketing · Sync vi.json mỗi thay đổi founding offer*
