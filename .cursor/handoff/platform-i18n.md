# KitPlatform · Platform & Đa ngữ — Thiết kế DB

> Chat title: **KitPlatform · Platform & Đa ngữ**
> Migration: `migrations/051_platform_multi_branch_i18n.sql`
> API: `GET /api/system/tenant-platform`

## Phân tích hiện trạng (trước 051)

| Khối | Đánh giá | Ghi chú |
|------|----------|---------|
| `tenants` + `branches` + `warehouses` | ✅ Mạnh | Đa chi nhánh trong 1 tenant |
| `sales_orders.branch_id` | ✅ | POS theo chi nhánh |
| `product_prices` | ⚠️ Chỉ tenant-wide | Thiếu giá theo CN |
| `products.drug_type` | ⚠️ Pharmacy-first | TBYT/TPCN cần `product_kind` |
| i18n | ❌ | Chỉ text tiếng Việt trong cột |
| Chuỗi cross-tenant | ❌ | Không có `organizations` |
| Assortment theo CN | ❌ | Mọi SP hiển thị mọi CN |
| `settings.platform` | ❌ | Chưa có metadata vertical |

## Bổ sung migration 051

### Bảng mới

| Bảng | Mục đích |
|------|----------|
| `organizations` | Chuỗi enterprise (n tenant) |
| `platform_locales` | vi-VN, en-US (EN status=0) |
| `entity_translations` | Dịch product/category/branch/... |
| `tenant_string_translations` | Nhãn UI tenant |
| `branch_product_listings` | SP có bán tại từng CN |
| `platform_module_registry` | Metadata module theo vertical |

### Cột mới

| Bảng | Cột |
|------|-----|
| `tenants` | `organization_id`, `business_vertical` |
| `branches` | `branch_type`, `locale_code`, `settings` |
| `products` | `product_kind`, `attributes` |
| `product_prices` | `branch_id` (NULL = giá chung) |
| `customer_accounts` | `preferred_locale` |
| `tenants.settings` | backfill `platform` JSON |

### `product_kind`

`pharmacy_drug` | `supplement` | `medical_device` | `general_retail` | `service` | `bundle`

Pilot: toàn bộ SP cũ = `pharmacy_drug`.

### Fallback pilot

Thiếu `settings.platform` → `ITenantPlatformSettings` trả pharmacy + vi-VN + full modules.

## Lộ trình sau 051

1. Admin UI: xem/sửa platform settings
2. POS: resolve giá theo `branch_id`
3. Catalog: CRUD `entity_translations`
4. react-i18next + `tenant_string_translations`
5. Module clinic/lab/spa — bảng nghiệp vụ mới

## Chạy migration

```powershell
.\scripts\run-migrations.ps1
```
