# Success P2 — Epic: Checklist mở/đóng ca

**Mã:** NVX-PRD-03-EP02 · **Capability:** Process Excellence (#2)  
**Phase:** P2 · **Trạng thái:** Implemented (lab) · 2026-07-14  
**Neo:** [pharmacy-success-capability-map-v1.md](./pharmacy-success-capability-map-v1.md) · [Owner Cockpit EP01](./success-p2-owner-cockpit-epic-v1.md)  
**Điều kiện mở:** Clinic P0 trên prod + Owner Cockpit lab ✅

> Thin wedge Process — **không** QMS / incident / thư viện SOP đầy đủ.

---

## Mục tiêu

Mỗi ca bán, chủ/quản lý hoặc thu ngân xác nhận **một checklist mỏng** mở ca / đóng ca — ghi dấu đã làm, không thay thế sổ tay giấy ngay lập tức.

## Scope MVP

| Hạng mục | Ghi chú |
|----------|---------|
| Template checklist mặc định (mở ca + đóng ca) | 5–8 mục mỗi loại, tenant có thể chỉnh sau |
| Gán branch / ca (ngày + buổi hoặc shift id đơn giản) | Không cần HRIS |
| Tick hoàn thành + người + thời điểm | Audit tối thiểu |
| Admin: xem trạng thái ca hôm nay (done / thiếu) | Deep-link từ Owner Cockpit (optional) |
| Gate module | `reports` hoặc module ops mỏng (`inventory`/`sales`) — chốt lúc implement |

**Không làm:** hoa hồng, KPI người bán, incident/khiếu nại, SOP đa trang, mobile-first riêng (dùng Admin trước).

## Deliverables

1. ✅ Mig `132_success_shift_checklist.sql` (template + run + items)  
2. ✅ API: `GET …/today`, `POST …/runs`, `PUT …/items/{id}`, `POST …/complete`  
3. ✅ Admin `/success/shift-checklist` + deep-link từ Owner Cockpit (gate `reports`)  
4. ✅ Smoke: `scripts/smoke-success-shift-checklist-local.ps1` · hypercare NT pilot còn Open  

## KPI 90 ngày

≥70% ca làm việc có đóng checklist trong tuần hypercare pilot **hoặc** chủ NT báo “không quên đóng két/đếm tồn đầu ngày” nhờ nhắc checklist.

## Ngoài scope → sau

- Scorecard quý / SWOT  
- Incident (sai sót / mất hàng) — P3  
- Người bán performance / hoa hồng — People track  
