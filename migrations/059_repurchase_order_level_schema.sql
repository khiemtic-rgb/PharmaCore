-- Align repurchase_suggestions with order-level schema (P5/P6 code).
-- Older pilot DBs created product-level rows with account_id before 055 could replace the table.

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'repurchase_suggestions'
          AND column_name = 'account_id'
    ) AND NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'repurchase_suggestions'
          AND column_name = 'customer_account_id'
    ) THEN
        ALTER TABLE repurchase_suggestions
            RENAME COLUMN account_id TO customer_account_id;
    END IF;
END $$;

ALTER TABLE repurchase_suggestions
    ADD COLUMN IF NOT EXISTS suggested_for_date DATE,
    ADD COLUMN IF NOT EXISTS drink_reminders_created_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS dismissed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS expired_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS order_label VARCHAR(120);

-- Backfill only on legacy product-level schema (dynamic SQL — PG validates columns at parse time)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'repurchase_suggestions'
          AND column_name = 'suggested_run_out_at'
    ) THEN
        EXECUTE $sql$
            UPDATE repurchase_suggestions
            SET suggested_for_date = COALESCE(
                    suggested_for_date,
                    suggested_run_out_at::date,
                    remind_at::date
                )
            WHERE suggested_for_date IS NULL
        $sql$;
    ELSIF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'repurchase_suggestions'
          AND column_name = 'remind_at'
    ) THEN
        EXECUTE $sql$
            UPDATE repurchase_suggestions
            SET suggested_for_date = COALESCE(suggested_for_date, remind_at::date)
            WHERE suggested_for_date IS NULL
        $sql$;
    END IF;
END $$;

UPDATE repurchase_suggestions rs
SET order_label = COALESCE(NULLIF(TRIM(rs.order_label), ''), CONCAT('Đơn ', so.order_number))
FROM sales_orders so
WHERE so.id = rs.sales_order_id
  AND (rs.order_label IS NULL OR TRIM(rs.order_label) = '');

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'repurchase_suggestions'
          AND column_name = 'product_id'
    ) THEN
        ALTER TABLE repurchase_suggestions
            ALTER COLUMN product_id DROP NOT NULL,
            ALTER COLUMN quantity DROP NOT NULL,
            ALTER COLUMN days_supply DROP NOT NULL,
            ALTER COLUMN purchased_at DROP NOT NULL,
            ALTER COLUMN suggested_run_out_at DROP NOT NULL,
            ALTER COLUMN remind_at DROP NOT NULL,
            ALTER COLUMN remind_before_days DROP NOT NULL;
    END IF;
END $$;

DROP INDEX IF EXISTS ix_repurchase_suggestions_account;

CREATE INDEX IF NOT EXISTS ix_repurchase_suggestions_customer
    ON repurchase_suggestions (tenant_id, customer_account_id, status, created_at DESC);
