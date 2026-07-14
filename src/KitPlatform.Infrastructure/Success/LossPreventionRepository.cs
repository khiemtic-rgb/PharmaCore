using Dapper;
using KitPlatform.Application.Abstractions;
using KitPlatform.Application.Success;
using KitPlatform.Infrastructure.Dashboard;
using KitPlatform.Infrastructure.Data;
using KitPlatform.Packs.Pharmacy.Inventory;
using KitPlatform.Packs.Pharmacy.Sales;

namespace KitPlatform.Infrastructure.Success;

internal sealed class LossPreventionRepository
{
    public const decimal DefaultCashVarianceThreshold = 10_000m;

    private readonly IDbConnectionFactory _db;
    private readonly ITenantContext _tenant;

    public LossPreventionRepository(IDbConnectionFactory db, ITenantContext tenant)
    {
        _db = db;
        _tenant = tenant;
    }

    private Guid TenantId => _tenant.TenantId;

    public async Task<IReadOnlyList<LossCashVarianceShiftDto>> ListTodayShiftsAsync(
        decimal threshold,
        Guid[]? allowedWarehouseIds,
        CancellationToken cancellationToken)
    {
        var (dayStart, dayEnd) = VietnamBusinessCalendar.TodayRangeUtc(DateTime.UtcNow);
        var warehouseFilter = allowedWarehouseIds is { Length: > 0 }
            ? "AND s.warehouse_id = ANY(@AllowedWarehouseIds)"
            : string.Empty;

        await using var conn = await _db.CreateOpenConnectionAsync(cancellationToken);
        var rows = await conn.QueryAsync<(
            Guid ShiftId,
            string ShiftNumber,
            Guid WarehouseId,
            string WarehouseName,
            Guid BranchId,
            string BranchName,
            short Status,
            decimal OpeningCash,
            decimal? ClosingCash,
            decimal? ExpectedCash,
            decimal? CashVariance,
            DateTime OpenedAt,
            DateTime? ClosedAt)>(
            $"""
            SELECT
                s.id AS ShiftId,
                s.shift_number AS ShiftNumber,
                s.warehouse_id AS WarehouseId,
                w.warehouse_name AS WarehouseName,
                w.branch_id AS BranchId,
                b.branch_name AS BranchName,
                s.status AS Status,
                s.opening_cash AS OpeningCash,
                s.closing_cash AS ClosingCash,
                s.expected_cash AS ExpectedCash,
                s.cash_variance AS CashVariance,
                s.opened_at AS OpenedAt,
                s.closed_at AS ClosedAt
            FROM sales_shifts s
            INNER JOIN warehouses w ON w.id = s.warehouse_id AND w.tenant_id = s.tenant_id
            INNER JOIN branches b ON b.id = w.branch_id AND b.tenant_id = s.tenant_id
            WHERE s.tenant_id = @TenantId
              AND (
                    s.status = @Open
                 OR (s.status = @Closed AND s.closed_at >= @DayStart AND s.closed_at < @DayEnd)
              )
              {warehouseFilter}
            ORDER BY
                CASE WHEN s.cash_variance IS NULL THEN 1 ELSE 0 END,
                ABS(COALESCE(s.cash_variance, 0)) DESC,
                s.opened_at DESC
            """,
            new
            {
                TenantId,
                DayStart = dayStart,
                DayEnd = dayEnd,
                Open = SalesShiftStatuses.Open,
                Closed = SalesShiftStatuses.Closed,
                AllowedWarehouseIds = allowedWarehouseIds,
            });

        return rows.Select(r =>
        {
            var abs = Math.Abs(r.CashVariance ?? 0);
            var status = r.Status == SalesShiftStatuses.Open ? "open" : "closed";
            var isAlert = r.Status == SalesShiftStatuses.Closed
                          && r.CashVariance is not null
                          && abs > threshold;
            return new LossCashVarianceShiftDto(
                r.ShiftId,
                r.ShiftNumber,
                r.WarehouseId,
                r.WarehouseName,
                r.BranchId,
                r.BranchName,
                status,
                r.OpeningCash,
                r.ClosingCash,
                r.ExpectedCash,
                r.CashVariance,
                abs,
                isAlert,
                r.OpenedAt,
                r.ClosedAt);
        }).ToList();
    }

    public async Task<IReadOnlyList<LossEmployeeCancelRowDto>> ListCancellationsByEmployeeAsync(
        DateTime fromUtc,
        DateTime toUtc,
        Guid? branchId,
        Guid[]? allowedWarehouseIds,
        CancellationToken cancellationToken)
    {
        var filters = BuildSalesScopeFilters(branchId, allowedWarehouseIds);
        await using var conn = await _db.CreateOpenConnectionAsync(cancellationToken);
        var rows = await conn.QueryAsync<LossEmployeeCancelRowDto>(
            $"""
            SELECT
                o.employee_id AS EmployeeId,
                COALESCE(e.full_name, '(Không gắn NV)') AS EmployeeName,
                COUNT(*)::int AS CancelCount,
                COALESCE(SUM(o.total_amount), 0) AS CancelValue
            FROM sales_orders o
            LEFT JOIN employees e ON e.id = o.employee_id AND e.tenant_id = o.tenant_id
            INNER JOIN warehouses w ON w.id = o.warehouse_id AND w.tenant_id = o.tenant_id
            WHERE o.tenant_id = @TenantId
              AND o.status = @Cancelled
              AND o.updated_at >= @FromUtc AND o.updated_at < @ToUtc
              {filters}
            GROUP BY o.employee_id, e.full_name
            ORDER BY CancelValue DESC, CancelCount DESC
            """,
            new
            {
                TenantId,
                FromUtc = fromUtc,
                ToUtc = toUtc,
                Cancelled = SalesOrderStatuses.Cancelled,
                BranchId = branchId,
                AllowedWarehouseIds = allowedWarehouseIds,
            });
        return rows.AsList();
    }

    public async Task<IReadOnlyList<LossEmployeeDiscountRowDto>> ListDiscountsByEmployeeAsync(
        DateTime fromUtc,
        DateTime toUtc,
        Guid? branchId,
        Guid[]? allowedWarehouseIds,
        CancellationToken cancellationToken)
    {
        var filters = BuildSalesScopeFilters(branchId, allowedWarehouseIds);
        await using var conn = await _db.CreateOpenConnectionAsync(cancellationToken);
        var rows = await conn.QueryAsync<LossEmployeeDiscountRowDto>(
            $"""
            SELECT
                o.employee_id AS EmployeeId,
                COALESCE(e.full_name, '(Không gắn NV)') AS EmployeeName,
                COUNT(*)::int AS OrderCount,
                COALESCE(SUM(o.discount_amount), 0) AS OrderDiscountAmount,
                COALESCE(SUM(line.line_discount), 0) AS LineDiscountAmount,
                COALESCE(SUM(o.discount_amount), 0) + COALESCE(SUM(line.line_discount), 0) AS TotalPosDiscount
            FROM sales_orders o
            LEFT JOIN LATERAL (
                SELECT COALESCE(SUM(i.discount_amount), 0) AS line_discount
                FROM sales_order_items i
                WHERE i.sales_order_id = o.id
            ) line ON TRUE
            LEFT JOIN employees e ON e.id = o.employee_id AND e.tenant_id = o.tenant_id
            INNER JOIN warehouses w ON w.id = o.warehouse_id AND w.tenant_id = o.tenant_id
            WHERE o.tenant_id = @TenantId
              AND o.status = @Completed
              AND o.order_date >= @FromUtc AND o.order_date < @ToUtc
              AND (COALESCE(o.discount_amount, 0) > 0 OR COALESCE(line.line_discount, 0) > 0)
              {filters}
            GROUP BY o.employee_id, e.full_name
            ORDER BY TotalPosDiscount DESC, OrderCount DESC
            """,
            new
            {
                TenantId,
                FromUtc = fromUtc,
                ToUtc = toUtc,
                Completed = SalesOrderStatuses.Completed,
                BranchId = branchId,
                AllowedWarehouseIds = allowedWarehouseIds,
            });
        return rows.AsList();
    }

    public async Task<IReadOnlyList<LossEmployeeAdjustmentRowDto>> ListAdjustmentsByEmployeeAsync(
        DateTime fromUtc,
        DateTime toUtc,
        Guid? branchId,
        Guid[]? allowedWarehouseIds,
        CancellationToken cancellationToken)
    {
        var warehouseFilter = allowedWarehouseIds is { Length: > 0 }
            ? "AND a.warehouse_id = ANY(@AllowedWarehouseIds)"
            : string.Empty;
        var branchFilter = branchId is not null ? "AND w.branch_id = @BranchId" : string.Empty;

        await using var conn = await _db.CreateOpenConnectionAsync(cancellationToken);
        var rows = await conn.QueryAsync<LossEmployeeAdjustmentRowDto>(
            $"""
            SELECT
                u.employee_id AS EmployeeId,
                COALESCE(e.full_name, u.username, '(Không gắn NV)') AS EmployeeName,
                COUNT(DISTINCT a.id)::int AS AdjustmentCount,
                COALESCE(SUM(ABS(i.difference_quantity) * COALESCE(b.unit_cost, 0)), 0) AS AbsVarianceValue
            FROM inventory_adjustments a
            INNER JOIN inventory_adjustment_items i ON i.adjustment_id = a.id
            INNER JOIN inventory_batches b ON b.id = i.batch_id
            INNER JOIN users u ON u.id = a.approved_by
            LEFT JOIN employees e ON e.id = u.employee_id AND e.tenant_id = a.tenant_id
            INNER JOIN warehouses w ON w.id = a.warehouse_id AND w.tenant_id = a.tenant_id
            WHERE a.tenant_id = @TenantId
              AND a.status = @Approved
              AND a.approved_by IS NOT NULL
              AND a.approved_at >= @FromUtc AND a.approved_at < @ToUtc
              {branchFilter}
              {warehouseFilter}
            GROUP BY u.employee_id, COALESCE(e.full_name, u.username, '(Không gắn NV)')
            ORDER BY AbsVarianceValue DESC, AdjustmentCount DESC
            """,
            new
            {
                TenantId,
                FromUtc = fromUtc,
                ToUtc = toUtc,
                Approved = AdjustmentStatuses.Approved,
                BranchId = branchId,
                AllowedWarehouseIds = allowedWarehouseIds,
            });
        return rows.AsList();
    }

    private static string BuildSalesScopeFilters(Guid? branchId, Guid[]? allowedWarehouseIds)
    {
        var branchFilter = branchId is not null ? "AND w.branch_id = @BranchId" : string.Empty;
        var warehouseFilter = allowedWarehouseIds is { Length: > 0 }
            ? "AND o.warehouse_id = ANY(@AllowedWarehouseIds)"
            : string.Empty;
        return $"{branchFilter} {warehouseFilter}";
    }
}
