-- Placeholder supplier for draft PO + GRN pricing (line/order discount, VAT header)

ALTER TABLE suppliers
    ADD COLUMN IF NOT EXISTS is_placeholder BOOLEAN NOT NULL DEFAULT FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS uq_suppliers_placeholder
    ON suppliers(tenant_id)
    WHERE is_placeholder = TRUE AND deleted_at IS NULL;

INSERT INTO suppliers (tenant_id, supplier_code, supplier_name, is_placeholder, status)
SELECT t.id, 'NCC-TBD', 'Chưa xác định', TRUE, 1
FROM tenants t
WHERE NOT EXISTS (
    SELECT 1 FROM suppliers s
    WHERE s.tenant_id = t.id AND s.is_placeholder = TRUE AND s.deleted_at IS NULL
);

ALTER TABLE goods_receipts
    ADD COLUMN IF NOT EXISTS vat_treatment_id UUID REFERENCES procurement_vat_treatments(id),
    ADD COLUMN IF NOT EXISTS tax_rate_percent SMALLINT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS subtotal_gross NUMERIC(18,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS line_discount_total NUMERIC(18,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS merchandise_net NUMERIC(18,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS order_discount_type SMALLINT,
    ADD COLUMN IF NOT EXISTS order_discount_value NUMERIC(18,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS order_discount_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_amount NUMERIC(18,2) NOT NULL DEFAULT 0;

ALTER TABLE goods_receipt_items
    ADD COLUMN IF NOT EXISTS discount_type SMALLINT,
    ADD COLUMN IF NOT EXISTS discount_value NUMERIC(18,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS inventory_unit_cost NUMERIC(18,2) NOT NULL DEFAULT 0;

-- Backfill legacy GRN totals from line totals
UPDATE goods_receipts g
SET
    subtotal_gross = x.sum_total,
    merchandise_net = x.sum_total,
    total_amount = x.sum_total
FROM (
    SELECT goods_receipt_id, COALESCE(SUM(line_total), 0) AS sum_total
    FROM goods_receipt_items
    GROUP BY goods_receipt_id
) x
WHERE g.id = x.goods_receipt_id
  AND g.total_amount = 0;

UPDATE goods_receipt_items
SET inventory_unit_cost = CASE WHEN quantity > 0 THEN line_total / quantity ELSE unit_cost END
WHERE inventory_unit_cost = 0;
