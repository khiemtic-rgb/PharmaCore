-- KitPlatform 086: Expand pack_pharmacy strangler views for Phase C report read cutover
-- Depends on: 085_pack_pharmacy_inventory_views.sql
-- Note: DROP + CREATE required when inserting columns (CREATE OR REPLACE cannot reorder).

DROP VIEW IF EXISTS pack_pharmacy.v_sales_order;
DROP VIEW IF EXISTS pack_pharmacy.v_product;
DROP VIEW IF EXISTS pack_pharmacy.v_goods_receipt;

CREATE VIEW pack_pharmacy.v_sales_order AS
SELECT
    so.id,
    so.tenant_id,
    so.branch_id,
    so.warehouse_id,
    so.customer_id,
    so.order_number,
    so.order_date,
    so.status,
    so.total_amount,
    so.created_at,
    so.updated_at
FROM public.sales_orders so;

CREATE VIEW pack_pharmacy.v_product AS
SELECT
    p.id,
    p.tenant_id,
    p.category_id,
    p.product_code,
    p.product_name,
    p.status,
    p.created_at,
    p.updated_at,
    p.deleted_at
FROM public.products p;

CREATE VIEW pack_pharmacy.v_goods_receipt AS
SELECT
    g.id,
    g.tenant_id,
    g.purchase_order_id,
    g.grn_number,
    g.supplier_id,
    g.warehouse_id,
    g.receipt_date,
    g.status,
    g.created_at,
    g.updated_at,
    g.deleted_at
FROM public.goods_receipts g;

COMMENT ON VIEW pack_pharmacy.v_sales_order IS 'Strangler read view — reports + admin read cutover (warehouse_id, order_date).';
COMMENT ON VIEW pack_pharmacy.v_product IS 'Strangler read view — includes category_id for revenue reports.';
COMMENT ON VIEW pack_pharmacy.v_goods_receipt IS 'Strangler read view — includes receipt_date for procurement reports.';
