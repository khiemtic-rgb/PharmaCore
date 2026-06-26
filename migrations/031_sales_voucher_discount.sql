-- Track voucher discount separately from loyalty points redeem.

ALTER TABLE sales_orders
    ADD COLUMN IF NOT EXISTS voucher_discount_amount NUMERIC(18, 2) NOT NULL DEFAULT 0;

COMMENT ON COLUMN sales_orders.voucher_discount_amount IS
    'Discount amount from customer voucher applied at checkout.';
