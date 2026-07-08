# Screenshots — Sales Deck

Ảnh chụp từ **dev local** (DEMO_PHARMACY) hoặc production khi cấu hình env.

## Chụp lại

```bash
# Terminal 1: API + Admin + Customer (+ Staff 5175)
# E:\KitPlatform\run-dev.bat

cd docs/novixa/launch/DOC-008
npm install
npx playwright install chromium
npm run capture
```

## Map slide ↔ ảnh

| File | Slide | Màn hình |
|------|-------|----------|
| 01-dashboard.png | 8 | Dashboard |
| 02-catalog-products.png | 10 | Danh mục SP |
| 03-procurement-grn.png | 11 | GRN |
| 04-inventory-stock.png | 12 | Tồn kho lô |
| 05-sales-pos.png | 13 | POS |
| 06-customer-crm.png | 15 | CRM |
| 07-o2o-drafts.png | 17 | O2O |
| 08-reports-home.png | 18 | Báo cáo |
| 09-customer-app-home.png | 16 | App khách |
| 10-staff-pos.png | 14 | Staff mobile *(tuỳ chụp)* |

Manifest: `manifest.json`

## Export PPT có ảnh

```bash
python export-sales-deck-pptx.py
# -> sales-deck-v1-with-screenshots.pptx
```

Trong `sales-deck-v1.md`, dùng:

```markdown
![Mô tả](./assets/screenshots/05-sales-pos.png)
```
