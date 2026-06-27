-- Scale 10x10: branch-scoped reservations + list indexes for high-volume tenants

ALTER TABLE customer_reservations
    ADD COLUMN IF NOT EXISTS warehouse_id UUID REFERENCES warehouses(id);

UPDATE customer_reservations cr
SET warehouse_id = sub.id
FROM (
    SELECT DISTINCT ON (cr2.id)
        cr2.id AS reservation_id,
        COALESCE(so.warehouse_id, w.id) AS id
    FROM customer_reservations cr2
    LEFT JOIN sales_orders so ON so.id = cr2.sales_order_id
    LEFT JOIN LATERAL (
        SELECT w2.id
        FROM warehouses w2
        WHERE w2.tenant_id = cr2.tenant_id
          AND w2.deleted_at IS NULL
          AND w2.status = 1
        ORDER BY w2.is_default DESC, w2.warehouse_name
        LIMIT 1
    ) w ON TRUE
    WHERE cr2.warehouse_id IS NULL
) sub
WHERE cr.id = sub.reservation_id
  AND cr.warehouse_id IS NULL;

ALTER TABLE customer_reservations
    ALTER COLUMN warehouse_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS ix_customer_reservations_warehouse
    ON customer_reservations (tenant_id, warehouse_id, status, submitted_at DESC);

CREATE INDEX IF NOT EXISTS ix_sales_orders_tenant_warehouse_created
    ON sales_orders (tenant_id, warehouse_id, order_date DESC);

CREATE INDEX IF NOT EXISTS ix_purchase_orders_tenant_warehouse_created
    ON purchase_orders (tenant_id, warehouse_id, created_at DESC)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS ix_goods_receipts_tenant_warehouse_created
    ON goods_receipts (tenant_id, warehouse_id, created_at DESC)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS ix_customer_draft_orders_warehouse
    ON customer_draft_orders (tenant_id, warehouse_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS ix_warehouses_tenant_branch
    ON warehouses (tenant_id, branch_id)
    WHERE deleted_at IS NULL;

-- Admin tenant-wide: bo gan chi nhanh cho user co role ADMIN.
DELETE FROM employee_branches eb
WHERE eb.employee_id IN (
    SELECT u.employee_id
    FROM users u
    INNER JOIN user_roles ur ON ur.user_id = u.id
    INNER JOIN roles r ON r.id = ur.role_id AND r.role_code = 'ADMIN'
    WHERE u.deleted_at IS NULL AND u.employee_id IS NOT NULL
);
