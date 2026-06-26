-- INV-004-B: multi-counter inventory count entries

CREATE TABLE inventory_adjustment_count_entries (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    adjustment_id       UUID          NOT NULL REFERENCES inventory_adjustments(id) ON DELETE CASCADE,
    product_id          UUID          NOT NULL REFERENCES products(id),
    batch_id            UUID          REFERENCES inventory_batches(id),
    quantity            NUMERIC(18,3) NOT NULL,
    counter_user_id     UUID          REFERENCES users(id),
    zone                VARCHAR(100),
    scanned_barcode     VARCHAR(100),
    note                TEXT,
    created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_count_entries_qty_pos CHECK (quantity > 0)
);

CREATE INDEX ix_count_entries_adjustment_product
    ON inventory_adjustment_count_entries (adjustment_id, product_id);

CREATE INDEX ix_count_entries_adjustment_batch
    ON inventory_adjustment_count_entries (adjustment_id, batch_id)
    WHERE batch_id IS NOT NULL;

-- At most one active counting session per warehouse per tenant
CREATE UNIQUE INDEX uq_inventory_adjustments_counting_per_wh
    ON inventory_adjustments (tenant_id, warehouse_id)
    WHERE status = 2;
