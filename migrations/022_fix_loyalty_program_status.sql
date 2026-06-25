-- Chương trình tích điểm bị lưu status=0 do form Admin thiếu field status.
UPDATE loyalty_programs lp
SET status = 1,
    updated_at = NOW()
FROM tenants t
WHERE lp.tenant_id = t.id
  AND lp.status = 0
  AND COALESCE((t.settings->>'loyalty_enabled')::boolean, false) = true;
