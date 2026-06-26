-- Customer draft orders (O2O) — separate from sales_orders POS drafts.
-- Flow: pharmacist sends draft -> customer views/confirms optionally -> POS completes sale.

CREATE TABLE customer_draft_orders (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID          NOT NULL REFERENCES tenants(id),
    customer_id         UUID          NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    draft_number        VARCHAR(50)   NOT NULL,
    chat_thread_id      UUID          REFERENCES customer_chat_threads(id),
    warehouse_id        UUID          NOT NULL REFERENCES warehouses(id),
    price_type          SMALLINT      NOT NULL DEFAULT 1,
    status              SMALLINT      NOT NULL DEFAULT 1,
    subtotal            NUMERIC(18,2) NOT NULL DEFAULT 0,
    discount_amount     NUMERIC(18,2) NOT NULL DEFAULT 0,
    total_amount        NUMERIC(18,2) NOT NULL DEFAULT 0,
    order_discount_type SMALLINT,
    order_discount_value NUMERIC(18,2),
    notes               TEXT,
    sent_at             TIMESTAMPTZ,
    confirmed_at        TIMESTAMPTZ,
    completed_at        TIMESTAMPTZ,
    cancelled_at        TIMESTAMPTZ,
    expires_at          TIMESTAMPTZ,
    sales_order_id      UUID          REFERENCES sales_orders(id),
    created_by          UUID          REFERENCES users(id),
    created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_customer_draft_orders_number UNIQUE (tenant_id, draft_number)
);

COMMENT ON COLUMN customer_draft_orders.status IS '1=Draft 2=Sent 3=Confirmed 4=Completed 5=Cancelled 6=Expired';

CREATE INDEX ix_customer_draft_orders_customer
    ON customer_draft_orders (tenant_id, customer_id, status, created_at DESC);

CREATE INDEX ix_customer_draft_orders_sales_order
    ON customer_draft_orders (sales_order_id)
    WHERE sales_order_id IS NOT NULL;

CREATE TABLE customer_draft_order_items (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    draft_order_id      UUID          NOT NULL REFERENCES customer_draft_orders(id) ON DELETE CASCADE,
    line_number         INT           NOT NULL,
    product_id          UUID          NOT NULL REFERENCES products(id),
    product_unit_id     UUID          NOT NULL REFERENCES product_units(id),
    product_code        VARCHAR(50)   NOT NULL,
    product_name        VARCHAR(255)  NOT NULL,
    unit_name           VARCHAR(50)   NOT NULL,
    quantity            NUMERIC(18,4) NOT NULL,
    unit_price          NUMERIC(18,2) NOT NULL,
    line_discount_type  SMALLINT,
    line_discount_value NUMERIC(18,2),
    line_amount         NUMERIC(18,2) NOT NULL,
    dosage_note         VARCHAR(255),
    created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX ix_customer_draft_order_items_draft
    ON customer_draft_order_items (draft_order_id, line_number);

CREATE TRIGGER trg_customer_draft_orders_updated
    BEFORE UPDATE ON customer_draft_orders
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
