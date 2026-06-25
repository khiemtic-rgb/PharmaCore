-- Ghi điểm / tiền giảm từ đổi điểm trên đơn bán
ALTER TABLE sales_orders
    ADD COLUMN IF NOT EXISTS loyalty_points_redeemed INT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS loyalty_discount_amount NUMERIC(18,2) NOT NULL DEFAULT 0;
