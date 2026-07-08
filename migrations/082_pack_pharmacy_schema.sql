-- KitPlatform 082: Pack 1 — Pharmacy schema (strangler views + extension table)
-- Depends on: 081_kit_kernel_rls_workspace.sql
-- Pilot-safe: additive only. Legacy transactional tables stay in public.*.

CREATE SCHEMA IF NOT EXISTS pack_pharmacy;

COMMENT ON SCHEMA pack_pharmacy IS
    'Novixa Pharmacy Pack — strangler read views over public.* + pack extension tables.';

-- =============================================================================
-- Strangler read views (pack boundary; no write path yet)
-- =============================================================================

CREATE OR REPLACE VIEW pack_pharmacy.v_product AS
SELECT
    p.id,
    p.tenant_id,
    p.product_code,
    p.product_name,
    p.status,
    p.created_at,
    p.updated_at,
    p.deleted_at
FROM public.products p;

CREATE OR REPLACE VIEW pack_pharmacy.v_sales_order AS
SELECT
    so.id,
    so.tenant_id,
    so.branch_id,
    so.customer_id,
    so.order_number,
    so.status,
    so.total_amount,
    so.created_at,
    so.updated_at
FROM public.sales_orders so;

CREATE OR REPLACE VIEW pack_pharmacy.v_customer AS
SELECT
    c.id,
    c.tenant_id,
    c.customer_code,
    c.full_name,
    c.phone,
    c.status,
    c.party_id,
    c.created_at,
    c.updated_at,
    c.deleted_at
FROM public.customers c;

COMMENT ON VIEW pack_pharmacy.v_product IS 'Strangler read view — cutover writes remain public.products.';
COMMENT ON VIEW pack_pharmacy.v_sales_order IS 'Strangler read view — cutover writes remain public.sales_orders.';
COMMENT ON VIEW pack_pharmacy.v_customer IS 'Strangler read view — party sync via KernelPartyWriter.';

-- =============================================================================
-- Pack extension: dispensing / counseling notes (additive)
-- =============================================================================

CREATE TABLE IF NOT EXISTS pack_pharmacy.pharmacy_dispensing_note (
    id               UUID         PRIMARY KEY DEFAULT kit_uuid_v7(),
    tenant_id        UUID         NOT NULL REFERENCES public.tenants(id),
    workspace_id     UUID         REFERENCES kit_workspace.workspace_workspace(id),
    sales_order_id   UUID         NOT NULL REFERENCES public.sales_orders(id),
    customer_id      UUID         REFERENCES public.customers(id),
    note_type        VARCHAR(30)  NOT NULL DEFAULT 'counseling',
    note_text        TEXT,
    metadata         JSONB        NOT NULL DEFAULT '{}'::jsonb,
    row_version      INT          NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_by       UUID,
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_by       UUID,
    deleted_at       TIMESTAMPTZ,
    CONSTRAINT ck_pharmacy_dispensing_note_type CHECK (
        note_type IN ('counseling', 'interaction', 'adherence', 'other')
    )
);

CREATE INDEX IF NOT EXISTS ix_pharmacy_dispensing_note_order
    ON pack_pharmacy.pharmacy_dispensing_note (tenant_id, sales_order_id)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS ix_pharmacy_dispensing_note_workspace
    ON pack_pharmacy.pharmacy_dispensing_note (workspace_id)
    WHERE workspace_id IS NOT NULL AND deleted_at IS NULL;

DROP TRIGGER IF EXISTS trg_pharmacy_dispensing_note_row_version ON pack_pharmacy.pharmacy_dispensing_note;
CREATE TRIGGER trg_pharmacy_dispensing_note_row_version
    BEFORE UPDATE ON pack_pharmacy.pharmacy_dispensing_note
    FOR EACH ROW EXECUTE FUNCTION kit_bump_row_version();

-- Backfill workspace_id from default pharmacy workspace
UPDATE pack_pharmacy.pharmacy_dispensing_note t
SET workspace_id = w.id, updated_at = NOW()
FROM kit_workspace.workspace_workspace w
WHERE t.workspace_id IS NULL
  AND w.tenant_id = t.tenant_id
  AND w.package_code = 'novixa_pharmacy'
  AND w.deleted_at IS NULL;

UPDATE pack_pharmacy.pharmacy_dispensing_note t
SET workspace_id = w.id, updated_at = NOW()
FROM kit_workspace.workspace_workspace w
WHERE t.workspace_id IS NULL
  AND w.tenant_id = t.tenant_id
  AND w.is_default = TRUE
  AND w.deleted_at IS NULL;

-- RLS
ALTER TABLE pack_pharmacy.pharmacy_dispensing_note ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON pack_pharmacy.pharmacy_dispensing_note;
CREATE POLICY tenant_isolation ON pack_pharmacy.pharmacy_dispensing_note
    FOR ALL
    USING (kit_rls_tenant_match(tenant_id))
    WITH CHECK (kit_rls_tenant_match(tenant_id));

-- Link meta_entity pack scope (idempotent)
UPDATE kit_meta.meta_entity
SET pack_code = 'novixa_pharmacy',
    schema_name = 'pack_pharmacy',
    updated_at = NOW()
WHERE entity_code IN ('product', 'sales_order', 'customer')
  AND (pack_code IS DISTINCT FROM 'novixa_pharmacy' OR schema_name IS DISTINCT FROM 'pack_pharmacy');
