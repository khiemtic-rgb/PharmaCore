using Dapper;
using KitPlatform.Application.Abstractions;
using KitPlatform.Application.Success;
using KitPlatform.Infrastructure.Dashboard;
using KitPlatform.Infrastructure.Data;
using KitPlatform.Packs.Pharmacy.Sales;

namespace KitPlatform.Infrastructure.Success;

internal sealed class OwnerCockpitRepository
{
    private readonly IDbConnectionFactory _db;
    private readonly ITenantContext _tenant;

    public OwnerCockpitRepository(IDbConnectionFactory db, ITenantContext tenant)
    {
        _db = db;
        _tenant = tenant;
    }

    private Guid TenantId => _tenant.TenantId;

    public async Task<(
        OwnerCockpitSalesExtrasDto Sales,
        OwnerCockpitInventoryExtrasDto Inventory,
        OwnerCockpitCustomerExtrasDto Customers,
        OwnerCockpitAssessmentSnapshotDto? Assessment)> GetExtrasAsync(
        int expiryDays,
        Guid[]? allowedWarehouseIds,
        CancellationToken cancellationToken)
    {
        if (expiryDays < 1) expiryDays = 30;

        var utcNow = DateTime.UtcNow;
        var (weekStart, weekEnd) = VietnamBusinessCalendar.RollingDaysRangeUtc(utcNow, 7);
        var (monthStart, monthEnd) = VietnamBusinessCalendar.MonthToDateRangeUtc(utcNow);
        var expiryCutoff = VietnamBusinessCalendar.Today(utcNow).AddDays(expiryDays);

        var orderWarehouseFilter = allowedWarehouseIds is { Length: > 0 }
            ? "AND o.warehouse_id = ANY(@AllowedWarehouseIds)"
            : string.Empty;
        var batchWarehouseFilter = allowedWarehouseIds is { Length: > 0 }
            ? "AND b.warehouse_id = ANY(@AllowedWarehouseIds)"
            : string.Empty;

        await using var conn = await _db.CreateOpenConnectionAsync(cancellationToken);

        var salesSql = $"""
            SELECT
                COALESCE((
                    SELECT SUM(sp.amount)
                    FROM sales_payments sp
                    INNER JOIN sales_orders o ON o.id = sp.sales_order_id
                    WHERE o.tenant_id = @TenantId
                      AND sp.paid_at >= @MonthStart AND sp.paid_at < @MonthEnd
                      {orderWarehouseFilter}
                ), 0)
                - COALESCE((
                    SELECT SUM(rp.amount)
                    FROM sales_return_payments rp
                    INNER JOIN sales_returns r ON r.id = rp.sales_return_id
                    INNER JOIN sales_orders o ON o.id = r.sales_order_id
                    WHERE r.tenant_id = @TenantId
                      AND rp.paid_at >= @MonthStart AND rp.paid_at < @MonthEnd
                      {orderWarehouseFilter}
                ), 0) AS MonthNetTotal,
                COALESCE((
                    SELECT COUNT(*)::int
                    FROM sales_orders o
                    WHERE o.tenant_id = @TenantId
                      AND o.status = @OrderCompleted
                      AND o.order_date >= @WeekStart AND o.order_date < @WeekEnd
                      {orderWarehouseFilter}
                ), 0) AS WeekOrderCount,
                COALESCE((
                    SELECT COUNT(*)::int
                    FROM sales_orders o
                    WHERE o.tenant_id = @TenantId
                      AND o.status = @OrderCompleted
                      AND o.order_date >= @MonthStart AND o.order_date < @MonthEnd
                      {orderWarehouseFilter}
                ), 0) AS MonthOrderCount
            """;

        var sales = await conn.QuerySingleAsync<(decimal MonthNetTotal, int WeekOrderCount, int MonthOrderCount)>(
            salesSql,
            new
            {
                TenantId,
                WeekStart = weekStart,
                WeekEnd = weekEnd,
                MonthStart = monthStart,
                MonthEnd = monthEnd,
                OrderCompleted = SalesOrderStatuses.Completed,
                AllowedWarehouseIds = allowedWarehouseIds,
            });

        var invSql = $"""
            SELECT
                COUNT(DISTINCT b.product_id)::int AS NearExpirySkuCount,
                COALESCE(SUM(b.quantity_available * COALESCE(b.unit_cost, 0)), 0) AS NearExpiryStockValue
            FROM inventory_batches b
            INNER JOIN products p ON p.id = b.product_id AND p.tenant_id = b.tenant_id AND p.deleted_at IS NULL
            WHERE b.tenant_id = @TenantId
              AND b.quantity_available > 0
              AND b.expiry_date IS NOT NULL
              AND b.expiry_date <= @ExpiryBefore
              {batchWarehouseFilter}
            """;

        var inventory = await conn.QuerySingleAsync<(int NearExpirySkuCount, decimal NearExpiryStockValue)>(
            invSql,
            new
            {
                TenantId,
                ExpiryBefore = expiryCutoff,
                AllowedWarehouseIds = allowedWarehouseIds,
            });

        const string customerSql = """
            SELECT
                COALESCE((
                    SELECT COUNT(*)::int
                    FROM customers c
                    WHERE c.tenant_id = @TenantId
                      AND c.deleted_at IS NULL
                      AND c.created_at >= @WeekStart AND c.created_at < @WeekEnd
                ), 0) AS NewCustomers7d,
                COALESCE((
                    SELECT COUNT(DISTINCT o.customer_id)::int
                    FROM sales_orders o
                    WHERE o.tenant_id = @TenantId
                      AND o.status = @OrderCompleted
                      AND o.customer_id IS NOT NULL
                      AND o.order_date >= @WeekStart AND o.order_date < @WeekEnd
                      AND EXISTS (
                          SELECT 1
                          FROM sales_orders prior
                          WHERE prior.tenant_id = o.tenant_id
                            AND prior.customer_id = o.customer_id
                            AND prior.status = @OrderCompleted
                            AND prior.order_date < @WeekStart
                      )
                ), 0) AS ReturningCustomers7d
            """;

        var customers = await conn.QuerySingleAsync<(int NewCustomers7d, int ReturningCustomers7d)>(
            customerSql,
            new
            {
                TenantId,
                WeekStart = weekStart,
                WeekEnd = weekEnd,
                OrderCompleted = SalesOrderStatuses.Completed,
            });

        OwnerCockpitAssessmentSnapshotDto? assessment = null;
        var hasAssessment = await conn.ExecuteScalarAsync<bool>("""
            SELECT EXISTS (
                SELECT 1
                FROM information_schema.tables
                WHERE table_schema = 'public' AND table_name = 'assessment_submission'
            )
            """);
        if (hasAssessment)
        {
            assessment = await conn.QuerySingleOrDefaultAsync<OwnerCockpitAssessmentSnapshotDto>("""
                SELECT
                    s.id AS SubmissionId,
                    s.overall_score AS OverallScore,
                    s.completed_at AS CompletedAt,
                    s.status AS Status
                FROM assessment_submission s
                WHERE s.tenant_id = @TenantId
                  AND s.archived_at IS NULL
                  AND s.status IN ('completed', 'lead_captured', 'report_ready')
                ORDER BY COALESCE(s.completed_at, s.started_at) DESC
                LIMIT 1
                """,
                new { TenantId });
        }

        return (
            new OwnerCockpitSalesExtrasDto(sales.MonthNetTotal, sales.WeekOrderCount, sales.MonthOrderCount),
            new OwnerCockpitInventoryExtrasDto(inventory.NearExpirySkuCount, inventory.NearExpiryStockValue),
            new OwnerCockpitCustomerExtrasDto(customers.NewCustomers7d, customers.ReturningCustomers7d),
            assessment);
    }
}
