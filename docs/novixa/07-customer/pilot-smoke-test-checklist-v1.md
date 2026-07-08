# Pilot smoke test — 3 nhà thuốc (post EA G2)

**Mã:** NVX-CS-08 · **Tier:** T2 · **Version:** 1.0 · **Ngày:** 2026-07-05  
**Phạm vi:** Xác nhận pilot sau nâng cấp Core Engines (Inventory, Pricing, Permission, Audit, AI) — **không đổi hành vi nghiệp vụ**.

> Go-live đầy đủ: [client/admin/pilot-go-live-checklist.md](../../client/admin/pilot-go-live-checklist.md)  
> EA evolution: [enterprise-architecture-evolution-v1.md](../03-solution/enterprise-architecture-evolution-v1.md)

---

## Trước khi test

```powershell
cd E:\KitPlatform
.\scripts\pre-pilot-check.ps1              # build + 16 tests + smoke (API running)
.\scripts\manual-smoke-pilot-helper.ps1    # manual A-D guide
```

- [ ] Build API **0 error**
- [ ] Unit test Platform gate **16/16 pass** (`KitPlatform.Platform.Tests`)
- [ ] Migration đã chạy (051 platform, 064–067 tuỳ môi trường)
- [ ] Automated smoke **PASS** (24 steps)
- [ ] Manual A1–A5 + B5 + C/D theo helper script

**Lặp checklist cho từng tenant pilot** (NT_A, NT_B, NT_C hoặc mã thực tế).

### Demo nhanh (dev)

| Mục | Giá trị |
|-----|---------|
| Admin | `http://localhost:5173` — `admin` / `Admin@123` |
| Customer | `http://localhost:5174` — `0909123456` / OTP `000000` |
| Tenant | `DEMO_PHARMACY` |
| Barcode OTC | `8934567890012` (Paracetamol), lô `LOT2026A` |

Sau A1/A5: `.\scripts\manual-smoke-pilot-helper.ps1 -AuditOnly -TenantCode DEMO_PHARMACY`

---

## A. Core Engines — POS & mua hàng (BR-PRC, BR-INV, POL-AUDIT)

| # | Bước | Kỳ vọng | NT1 | NT2 | NT3 |
|---|------|---------|-----|-----|-----|
| A1 | Mở ca → bán 1 SP OTC có lô/HSD | Đơn hoàn tất, tồn giảm **FEFO** (lô gần hết hạn trước) | ☐ | ☐ | ☐ |
| A2 | Bán cùng SP khi tồn lô 1 không đủ | Báo **không đủ tồn FEFO** hoặc lấy lô kế tiếp đúng | ☐ | ☐ | ☐ |
| A3 | User thường: chiết khấu dòng **vượt %** cho phép | **Từ chối** (BR-PRC-002/003) | ☐ | ☐ | ☐ |
| A4 | Admin: chiết khấu đơn hợp lệ | Giá đúng, đơn lưu OK | ☐ | ☐ | ☐ |
| A5 | PO → GRN hoàn tất 1 dòng | Tồn tăng, giá nhập đúng (Pricing Engine nhập) | ☐ | ☐ | ☐ |
| A6 | Kiểm kê → duyệt điều chỉnh tồn | Tồn khớp, không lỗi | ☐ | ☐ | ☐ |

**Audit (IAuditEngine):** sau A1, A5 — mở **Hệ thống → Nhật ký** (hoặc query `audit_logs`):

- [ ] Có bản ghi action bán hàng / GRN tương ứng tenant

---

## B. Customer App — Care & AI (NSF-CARE, NSF-AI)

| # | Bước | Kỳ vọng | NT1 | NT2 | NT3 |
|---|------|---------|-----|-----|-----|
| B1 | OTP login khách có SĐT pilot | Vào home OK | ☐ | ☐ | ☐ |
| B2 | Có nhắc uống thuốc / đơn gần đây | Hiển thị **Thuốc của tôi** / nhắc | ☐ | ☐ | ☐ |
| B3 | **AI Copilot:** hỏi *"Paracetamol uống trước ăn?"* | Trả lời có nội dung + disclaimer | ☐ | ☐ | ☐ |
| B4 | AI: gửi câu **"ab"** (2 ký tự) | **400** / báo câu hỏi quá ngắn (BR-AI-001) | ☐ | ☐ | ☐ |
| B5 | Chat dược sĩ (nếu bật consent) | Gửi/nhận tin OK | ☐ | ☐ | ☐ |
| B6 | Gia đình: thêm người thân + nhắc gắn người | Lưu OK | ☐ | ☐ | ☐ |

---

## F. KIT Platform — Pack gate (automated + Admin)

| # | Bước | Kỳ vọng | Auto |
|---|------|---------|------|
| F1 | `GET /api/system/tenant-platform` | `vertical`, `enabledModules` có dữ liệu | `smoke-pilot-nvx-cs08.ps1` |
| F2 | `GET /api/system/tenant-platform/modules` | ≥5 module trong registry | script |
| F3 | Module `customer_app` enabled | OTP B1 pass (403 nếu tắt) | script |
| F4 | Admin → **Hệ thống → KIT Platform / Pack** | Xem/sửa pack (ADMIN) | manual |
| F5 | Tắt `medication` → Lưu → reload app | API medication **403**; tab biến mất | `smoke-pilot-nvx-cs08.ps1` (API toggle + restore) |

---

## C. Admin — Engagement & báo cáo (tuỳ đã bật)

| # | Bước | Kỳ vọng |
|---|------|---------|
| C1 | Khách hàng → **Engagement app** (sau B3) | AI Usage > 0 trong kỳ |
| C2 | Báo cáo INV-02 cận date | Có dữ liệu nếu đã nhập lô HSD |
| C3 | Dashboard doanh thu | Khớp ít nhất 1 đơn từ A1 |

---

## D. Regression nhanh (15 phút / tenant)

- [ ] Trả hàng 1 dòng (nếu đã bán A1) — tiền hoàn hợp lý
- [ ] Đặt trước / draft O2O (nếu dùng) — staff xác nhận được
- [ ] Staff POS mobile: lookup tồn 1 mã — khớp admin

---

## E. Sign-off smoke (mỗi tenant)

| Tenant | Người test | Ngày | A pass | B pass | Ghi chú |
|--------|------------|------|--------|--------|---------|
| | | | ☐ | ☐ | |
| | | | ☐ | ☐ | |
| | | | ☐ | ☐ | |

**Tiêu chí pass:** A1–A5 + B1–B4 **bắt buộc**; còn lại theo phạm vi pilot từng NT.

---

## Khi fail

1. Ghi **tenant + bước + screenshot + API response**
2. `SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 5` (nếu liên quan A*)
3. Không hotfix production — fix trên dev, `dotnet test`, deploy lại
