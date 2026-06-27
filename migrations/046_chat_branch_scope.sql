-- O2O chat: scope staff inbox theo kho/chi nhanh

ALTER TABLE customer_chat_threads
    ADD COLUMN IF NOT EXISTS warehouse_id UUID REFERENCES warehouses(id);

UPDATE customer_chat_threads t
SET warehouse_id = sub.wh_id
FROM (
    SELECT
        t2.id AS thread_id,
        COALESCE(
            (
                SELECT d.warehouse_id
                FROM customer_draft_orders d
                WHERE d.tenant_id = t2.tenant_id
                  AND d.customer_id = t2.customer_id
                ORDER BY d.created_at DESC
                LIMIT 1
            ),
            (
                SELECT w.id
                FROM warehouses w
                WHERE w.tenant_id = t2.tenant_id
                  AND w.deleted_at IS NULL
                  AND w.status = 1
                ORDER BY w.is_default DESC, w.warehouse_name
                LIMIT 1
            )
        ) AS wh_id
    FROM customer_chat_threads t2
    WHERE t2.warehouse_id IS NULL
) sub
WHERE t.id = sub.thread_id
  AND t.warehouse_id IS NULL;

ALTER TABLE customer_chat_threads
    ALTER COLUMN warehouse_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS ix_customer_chat_threads_warehouse
    ON customer_chat_threads (tenant_id, warehouse_id, staff_unread_count DESC, last_message_at DESC);
