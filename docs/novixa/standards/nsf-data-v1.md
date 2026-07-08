# NSF-DATA — Data Standard v1

**Outcome:** Dữ liệu multi-tenant an toàn, audit được, đủ cho analytics sau này.

## Bắt buộc

- Mọi bảng nghiệp vụ: `tenant_id` (`BR-ID-001`).
- Soft-delete / status theo convention hiện có — không xóa cứng dữ liệu bán hàng.
- Audit write path quan trọng qua `IAuditEngine` / `IAuditLogService`.
- Integration outbound: outbox (không fire-and-forget mất sự kiện).

## Cấm

- AI / reporting ad-hoc sửa bảng operational.
- Cross-tenant query.
