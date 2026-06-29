-- Customer AR collection vouchers (mirror supplier_payments)

CREATE TABLE customer_payments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID          NOT NULL REFERENCES tenants(id),
    customer_id     UUID          NOT NULL REFERENCES customers(id),
    sales_order_id  UUID          REFERENCES sales_orders(id),
    payment_number  VARCHAR(50)   NOT NULL,
    amount          NUMERIC(18,2) NOT NULL,
    currency_code   CHAR(3)       NOT NULL DEFAULT 'VND',
    payment_method  SMALLINT      NOT NULL DEFAULT 1,
    payment_date    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    notes           TEXT,
    status          SMALLINT      NOT NULL DEFAULT 1,
    posted_at       TIMESTAMPTZ,
    updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ,
    created_by      UUID          REFERENCES users(id),
    posted_by       UUID          REFERENCES users(id),
    cancelled_at    TIMESTAMPTZ,
    cancelled_by    UUID          REFERENCES users(id),
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_customer_payments_number UNIQUE (tenant_id, payment_number)
);

COMMENT ON COLUMN customer_payments.status IS '1=Draft 2=Posted 3=Cancelled';

CREATE INDEX ix_customer_payments_customer
    ON customer_payments (tenant_id, customer_id, status, payment_date DESC);

CREATE INDEX ix_customer_payments_order
    ON customer_payments (tenant_id, sales_order_id)
    WHERE sales_order_id IS NOT NULL;

CREATE TRIGGER trg_customer_payments_updated
    BEFORE UPDATE ON customer_payments
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
