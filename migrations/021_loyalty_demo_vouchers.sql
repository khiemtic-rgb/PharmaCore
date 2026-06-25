-- PharmaCore 021: Demo voucher cho Trần Thị Mai

INSERT INTO vouchers (
    id,
    tenant_id,
    voucher_code,
    voucher_name,
    discount_type,
    discount_value,
    min_order_amount,
    valid_from,
    valid_to,
    status)
SELECT
    'dddddddd-dddd-dddd-dddd-dddddddddd01',
    '11111111-1111-1111-1111-111111111101',
    'WELCOME50K',
    'Giảm 50.000đ đơn từ 300k',
    2,
    50000,
    300000,
    NOW() - INTERVAL '1 day',
    NOW() + INTERVAL '30 days',
    1
WHERE NOT EXISTS (
    SELECT 1 FROM vouchers WHERE id = 'dddddddd-dddd-dddd-dddd-dddddddddd01');

INSERT INTO customer_vouchers (customer_id, voucher_id)
SELECT
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa01',
    'dddddddd-dddd-dddd-dddd-dddddddddd01'
WHERE NOT EXISTS (
    SELECT 1 FROM customer_vouchers
    WHERE customer_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa01'
      AND voucher_id = 'dddddddd-dddd-dddd-dddd-dddddddddd01');
