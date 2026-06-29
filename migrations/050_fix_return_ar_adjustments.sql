-- Recalculate AR fields on orders that already have returns but outstanding was never reduced.

WITH return_totals AS (
    SELECT
        r.sales_order_id,
        SUM(ri.refund_amount) AS total_returned
    FROM sales_returns r
    INNER JOIN sales_return_items ri ON ri.sales_return_id = r.id
    WHERE r.status = 2
    GROUP BY r.sales_order_id
),
adjusted AS (
    SELECT
        o.id,
        COALESCE(rt.total_returned, 0) AS total_returned,
        o.outstanding AS outstanding,
        o.amount_paid AS amount_paid,
        o.total_amount AS total_amount,
        LEAST(COALESCE(rt.total_returned, 0), o.outstanding) AS debt_reduced,
        LEAST(
            GREATEST(0, COALESCE(rt.total_returned, 0) - LEAST(COALESCE(rt.total_returned, 0), o.outstanding)),
            o.amount_paid
        ) AS paid_reduced
    FROM sales_orders o
    INNER JOIN return_totals rt ON rt.sales_order_id = o.id
    WHERE COALESCE(rt.total_returned, 0) > 0.009
)
UPDATE sales_orders o
SET
    outstanding = GREATEST(0, a.outstanding - a.debt_reduced),
    amount_paid = GREATEST(0, a.amount_paid - a.paid_reduced),
    total_amount = GREATEST(0, a.total_amount - a.total_returned)
FROM adjusted a
WHERE o.id = a.id
  AND (
        ABS(o.outstanding - GREATEST(0, a.outstanding - a.debt_reduced)) > 0.009
     OR ABS(o.amount_paid - GREATEST(0, a.amount_paid - a.paid_reduced)) > 0.009
     OR ABS(o.total_amount - GREATEST(0, a.total_amount - a.total_returned)) > 0.009
  );
