# Nhà thuốc Xuân Hoà — import từ Sapo

Nguồn: `danh_sach_san_pham_28.06.2026_*.xlsx` (Sapo)

## File đã chuyển

| File | Mục đích |
|------|----------|
| `danh-muc-novixa.csv` | 3.960 SP — import **một lần** (cả chuỗi) |
| `ton-dau-CN1.csv` | 1.794 dòng tồn — kho **LC_CN1** (map WH_CN01) |
| `ton-dau-CN2.csv` | 1.126 dòng tồn — kho **LC_CN2** (map WH_CN02) |
| `nha-cung-cap-novixa.csv` | **103** NCC — import Mua hàng → Nhà cung cấp |
| `khach-hang-novixa.csv` | **~3.329** KH — import Khách hàng → Danh sách |
| `conversion-report.md` | Cảnh báo barcode trùng, giá bán thiếu |
| `kh-conversion-report.md` | Báo cáo chuyển KH (SĐT placeholder, …) |
| `ncc-conversion-report.md` | Báo cáo chuyển NCC |

**Lô tồn đầu:** `TON-DAU-SAPO`, HSD placeholder `2030-12-31` — cập nhật lô thật sau kiểm kê.

## Chạy lại convert

```powershell
node scripts/convert-sapo-export.mjs "C:\Users\admin\Downloads\excel\danh_sach_san_pham_....xlsx" import/xuan-hoa
node scripts/convert-sapo-suppliers.mjs "C:\Users\admin\Downloads\danh_sach_nha_cung_cap_....xlsx" import/xuan-hoa
node scripts/convert-sapo-customers.mjs "C:\Users\admin\Downloads\danh_sach_khach_hang_....xlsx" import/xuan-hoa
```

## Import vào Novixa

1. Tạo tenant **Xuân Hoà** trên `/setup` (2 chi nhánh: CN01 + CN02, mã kho khớp Sapo LC_CN1/LC_CN2 nếu có thể).
2. Đăng nhập admin đúng **mã tenant**.
3. **Danh mục** → tab **Import Excel** → upload `danh-muc-novixa.csv` (~ vài phút).
4. **Mua hàng** → tab **Nhà cung cấp** → **Import NCC** → upload `nha-cung-cap-novixa.csv`.
5. **Kho hàng** → tab **Tồn đầu kỳ** → chọn kho CN1 → import `ton-dau-CN1.csv`.
6. Lặp kho CN2 → `ton-dau-CN2.csv`.
7. **Khách hàng** → **Import khách hàng** → upload `khach-hang-novixa.csv` (hoặc file Sapo gốc).
8. **Bán hàng** → POS test; **Hệ thống** → Chi nhánh / Nhân viên nếu chưa cấu hình.

Map tên kho Sapo: cột `LC_CN1_*` = chi nhánh 1, `LC_CN2_*` = chi nhánh 2.
