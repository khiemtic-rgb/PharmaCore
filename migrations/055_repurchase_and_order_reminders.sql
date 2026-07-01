-- Repurchase suggestions and order-level reminder metadata

ALTER TABLE sales_orders
    ADD COLUMN IF NOT EXISTS reminder_label VARCHAR(120),
    ADD COLUMN IF NOT EXISTS reminder_days_supply INT;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'ck_sales_orders_reminder_days_supply'
    ) THEN
        ALTER TABLE sales_orders
            ADD CONSTRAINT ck_sales_orders_reminder_days_supply
                CHECK (reminder_days_supply IS NULL OR reminder_days_supply BETWEEN 1 AND 730);
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS repurchase_suggestions (
    id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id                       UUID         NOT NULL REFERENCES tenants(id),
    customer_id                     UUID         NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    customer_account_id             UUID         NOT NULL REFERENCES customer_accounts(id) ON DELETE CASCADE,
    sales_order_id                  UUID         NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
    sales_order_item_id             UUID         REFERENCES sales_order_items(id) ON DELETE SET NULL,
    order_label                     VARCHAR(120) NOT NULL,
    status                          VARCHAR(20)  NOT NULL DEFAULT 'pending',
    suggested_for_date              DATE,
    snoozed_until                   TIMESTAMPTZ,
    dismissed_at                    TIMESTAMPTZ,
    expired_at                      TIMESTAMPTZ,
    drink_reminders_created_at      TIMESTAMPTZ,
    created_at                      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at                      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_repurchase_suggestions_order UNIQUE (sales_order_id),
    CONSTRAINT ck_repurchase_suggestions_status CHECK (
        status IN ('pending', 'dismissed', 'snoozed', 'expired')
    )
);

CREATE INDEX IF NOT EXISTS ix_repurchase_suggestions_customer
    ON repurchase_suggestions (tenant_id, customer_account_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS ix_repurchase_suggestions_snoozed
    ON repurchase_suggestions (tenant_id, status, snoozed_until)
    WHERE status = 'snoozed';

CREATE TRIGGER trg_repurchase_suggestions_updated
    BEFORE UPDATE ON repurchase_suggestions
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

INSERT INTO repurchase_suggestions (
    tenant_id,
    customer_id,
    customer_account_id,
    sales_order_id,
    sales_order_item_id,
    order_label,
    status,
    suggested_for_date
)
SELECT
    picked.tenant_id,
    picked.customer_id,
    picked.account_id,
    picked.sales_order_id,
    NULL,
    COALESCE(picked.reminder_label, CONCAT('Repurchase ', picked.order_number)),
    'pending',
    (picked.order_date + (COALESCE(picked.reminder_days_supply, 30) || ' day')::interval)::date
FROM (
    SELECT
        t.id AS tenant_id,
        c.id AS customer_id,
        ca.id AS account_id,
        so.id AS sales_order_id,
        so.order_number,
        so.order_date,
        so.reminder_label,
        so.reminder_days_supply
    FROM tenants t
    INNER JOIN customer_accounts ca
        ON ca.tenant_id = t.id
       AND ca.phone = '0909123456'
    INNER JOIN customers c
        ON c.id = ca.customer_id
       AND c.tenant_id = t.id
    INNER JOIN sales_orders so
        ON so.tenant_id = t.id
       AND so.customer_id = c.id
    WHERE t.tenant_code = 'DEMO_PHARMACY'
      AND t.deleted_at IS NULL
    ORDER BY so.order_date DESC
    LIMIT 1
) AS picked
ON CONFLICT (sales_order_id) DO NOTHING;
