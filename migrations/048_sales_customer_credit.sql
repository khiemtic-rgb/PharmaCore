-- Customer credit (AR) on sales orders — amount paid vs outstanding

ALTER TABLE customers
    ADD COLUMN IF NOT EXISTS allow_credit BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS credit_limit NUMERIC(18,2);

ALTER TABLE sales_orders
    ADD COLUMN IF NOT EXISTS amount_paid NUMERIC(18,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS outstanding NUMERIC(18,2) NOT NULL DEFAULT 0;

UPDATE sales_orders
SET amount_paid = total_amount,
    outstanding = 0
WHERE status = 2
  AND (amount_paid = 0 AND outstanding = 0);

-- Demo NT_XUANHOA: Khách Xuan Hoa (CUZN00488) — no-op nếu tenant chưa tồn tại
UPDATE customers c
SET allow_credit = TRUE,
    credit_limit = 5000000
FROM tenants t
WHERE c.tenant_id = t.id
  AND t.tenant_code = 'NT_XUANHOA'
  AND c.customer_code = 'CUZN00488';
