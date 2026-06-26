-- Customer can hide draft orders from their app (soft hide — staff still see full history).

ALTER TABLE customer_draft_orders
    ADD COLUMN IF NOT EXISTS hidden_by_customer_at TIMESTAMPTZ;

COMMENT ON COLUMN customer_draft_orders.hidden_by_customer_at IS
    'When set, order is hidden from customer app list/detail; admin/POS unchanged.';

CREATE INDEX IF NOT EXISTS ix_customer_draft_orders_customer_visible
    ON customer_draft_orders (tenant_id, customer_id, created_at DESC)
    WHERE hidden_by_customer_at IS NULL;
