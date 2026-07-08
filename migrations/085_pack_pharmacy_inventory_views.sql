-- KitPlatform 085: Pack Pharmacy — inventory/procurement strangler read views
-- Depends on: 082_pack_pharmacy_schema.sql

CREATE OR REPLACE VIEW pack_pharmacy.v_warehouse AS
SELECT
    w.id,
    w.tenant_id,
    w.branch_id,
    w.warehouse_code,
    w.warehouse_name,
    w.warehouse_type,
    w.is_default,
    w.status,
    w.created_at,
    w.updated_at,
    w.deleted_at
FROM public.warehouses w;

CREATE OR REPLACE VIEW pack_pharmacy.v_inventory_batch AS
SELECT
    b.id,
    b.tenant_id,
    b.warehouse_id,
    b.product_id,
    b.batch_number,
    b.expiry_date,
    b.quantity_available,
    b.unit_cost,
    b.status,
    b.created_at,
    b.updated_at
FROM public.inventory_batches b;

CREATE OR REPLACE VIEW pack_pharmacy.v_supplier AS
SELECT
    s.id,
    s.tenant_id,
    s.supplier_code,
    s.supplier_name,
    s.status,
    s.created_at,
    s.updated_at,
    s.deleted_at
FROM public.suppliers s;

CREATE OR REPLACE VIEW pack_pharmacy.v_purchase_order AS
SELECT
    p.id,
    p.tenant_id,
    p.supplier_id,
    p.po_number,
    p.warehouse_id,
    p.status,
    p.total_amount,
    p.created_at,
    p.updated_at
FROM public.purchase_orders p;

CREATE OR REPLACE VIEW pack_pharmacy.v_goods_receipt AS
SELECT
    g.id,
    g.tenant_id,
    g.purchase_order_id,
    g.grn_number,
    g.supplier_id,
    g.warehouse_id,
    g.status,
    g.created_at,
    g.updated_at
FROM public.goods_receipts g;

COMMENT ON VIEW pack_pharmacy.v_warehouse IS 'Strangler read view — writes remain public.warehouses.';
COMMENT ON VIEW pack_pharmacy.v_inventory_batch IS 'Strangler read view — writes remain public.inventory_batches.';
COMMENT ON VIEW pack_pharmacy.v_supplier IS 'Strangler read view — writes remain public.suppliers.';
COMMENT ON VIEW pack_pharmacy.v_purchase_order IS 'Strangler read view — writes remain public.purchase_orders.';
COMMENT ON VIEW pack_pharmacy.v_goods_receipt IS 'Strangler read view — writes remain public.goods_receipts.';
