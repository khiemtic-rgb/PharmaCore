-- KitPlatform 020: Demo loyalty transactions (Trần Thị Mai — 120 điểm)

INSERT INTO loyalty_transactions (
    tenant_id,
    customer_id,
    program_id,
    transaction_type,
    points,
    notes,
    created_at)
SELECT
    '11111111-1111-1111-1111-111111111101',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa01',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb01',
    1,
    80,
    'Tích điểm đơn POS demo',
    NOW() - INTERVAL '7 days'
WHERE NOT EXISTS (
    SELECT 1 FROM loyalty_transactions
    WHERE customer_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa01'
      AND notes = 'Tích điểm đơn POS demo');

INSERT INTO loyalty_transactions (
    tenant_id,
    customer_id,
    program_id,
    transaction_type,
    points,
    notes,
    created_at)
SELECT
    '11111111-1111-1111-1111-111111111101',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa01',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb01',
    1,
    40,
    'Tích điểm khuyến mãi tháng',
    NOW() - INTERVAL '3 days'
WHERE NOT EXISTS (
    SELECT 1 FROM loyalty_transactions
    WHERE customer_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa01'
      AND notes = 'Tích điểm khuyến mãi tháng');
