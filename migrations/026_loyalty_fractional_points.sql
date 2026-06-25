-- Cho phép trừ điểm lẻ khi đổi theo số tiền (ví dụ giảm 625đ = 0,0625 điểm)
ALTER TABLE customer_loyalty
    ALTER COLUMN points_balance TYPE NUMERIC(14, 4),
    ALTER COLUMN lifetime_points TYPE NUMERIC(14, 4);

ALTER TABLE loyalty_transactions
    ALTER COLUMN points TYPE NUMERIC(14, 4);

ALTER TABLE sales_orders
    ALTER COLUMN loyalty_points_redeemed TYPE NUMERIC(14, 4);
