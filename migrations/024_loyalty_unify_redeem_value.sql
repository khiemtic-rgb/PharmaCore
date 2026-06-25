-- Test thuận tiện: 1 điểm đổi = cùng mức tiền với tích 1 điểm (10.000đ ↔ 1 điểm)
UPDATE loyalty_programs
SET amount_per_point = points_per_amount,
    updated_at = NOW()
WHERE amount_per_point IS DISTINCT FROM points_per_amount;
