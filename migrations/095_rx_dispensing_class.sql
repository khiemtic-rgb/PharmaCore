-- KitPlatform 095: Rx-0 — product dispensing_class + POS block audit
-- Depends on: 003_catalog.sql, 082_pack_pharmacy_schema.sql

ALTER TABLE products
    ADD COLUMN IF NOT EXISTS dispensing_class VARCHAR(20) NOT NULL DEFAULT 'otc';

COMMENT ON COLUMN products.dispensing_class IS
    'Novixa Rx-0: otc | prescription | controlled — POS strict enforcement.';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'ck_products_dispensing_class'
    ) THEN
        ALTER TABLE products
            ADD CONSTRAINT ck_products_dispensing_class
            CHECK (dispensing_class IN ('otc', 'prescription', 'controlled'));
    END IF;
END $$;

UPDATE products
SET dispensing_class = CASE drug_type
    WHEN 2 THEN 'prescription'
    WHEN 3 THEN 'controlled'
    ELSE 'otc'
END
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS ix_products_dispensing_class
    ON products (tenant_id, dispensing_class)
    WHERE deleted_at IS NULL;

-- POS block audit (RxPosBlockedAudit)
CREATE TABLE IF NOT EXISTS pack_pharmacy.rx_pos_block_events (
    id              UUID         PRIMARY KEY DEFAULT kit_uuid_v7(),
    tenant_id       UUID         NOT NULL REFERENCES public.tenants(id),
    branch_id       UUID,
    warehouse_id    UUID,
    product_id      UUID         NOT NULL REFERENCES public.products(id),
    user_id         UUID,
    source          VARCHAR(30)  NOT NULL DEFAULT 'pos_scan',
    metadata        JSONB        NOT NULL DEFAULT '{}'::jsonb,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_rx_pos_block_events_source CHECK (
        source IN ('pos_scan', 'pos_checkout', 'pos_complete')
    )
);

CREATE INDEX IF NOT EXISTS ix_rx_pos_block_events_tenant_created
    ON pack_pharmacy.rx_pos_block_events (tenant_id, created_at DESC);

COMMENT ON TABLE pack_pharmacy.rx_pos_block_events IS
    'Audit: POS attempted to sell Rx SKU without valid prescription (strict mode).';
