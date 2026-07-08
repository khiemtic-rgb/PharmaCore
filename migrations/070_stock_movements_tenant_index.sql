-- KitPlatform 070: tenant-scoped indexes for stock_movements (multi-tenant scale)
-- Reports and inventory queries filter by tenant_id; ledger grows fastest per tenant.

CREATE INDEX IF NOT EXISTS ix_stock_movements_tenant_warehouse_date
    ON stock_movements (tenant_id, warehouse_id, movement_date DESC);

CREATE INDEX IF NOT EXISTS ix_stock_movements_tenant_date
    ON stock_movements (tenant_id, movement_date DESC);
