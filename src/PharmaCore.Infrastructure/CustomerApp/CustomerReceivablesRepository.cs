using Dapper;
using PharmaCore.Application.CustomerApp;
using PharmaCore.Application.Sales;
using PharmaCore.Infrastructure.Data;

namespace PharmaCore.Infrastructure.CustomerApp;

internal sealed class CustomerReceivablesRepository
{
    private readonly IDbConnectionFactory _db;

    public CustomerReceivablesRepository(IDbConnectionFactory db) => _db = db;

    public async Task<IReadOnlyList<CustomerReceivableLineDto>> ListOpenOrdersAsync(
        Guid tenantId,
        Guid customerId,
        CancellationToken cancellationToken)
    {
        const string sql = """
            SELECT
                o.id AS SalesOrderId,
                o.order_number AS OrderNumber,
                o.order_date AS OrderDate,
                o.total_amount AS OrderTotal,
                o.amount_paid AS AmountPaid,
                o.outstanding AS Outstanding
            FROM sales_orders o
            WHERE o.tenant_id = @TenantId
              AND o.customer_id = @CustomerId
              AND o.status = @Completed
              AND o.outstanding > 0.009
            ORDER BY o.order_date DESC, o.order_number DESC
            """;

        await using var conn = await _db.CreateOpenConnectionAsync(cancellationToken);
        var rows = await conn.QueryAsync<LineRow>(sql, new
        {
            TenantId = tenantId,
            CustomerId = customerId,
            Completed = SalesOrderStatuses.Completed,
        });

        return rows.Select(row => new CustomerReceivableLineDto(
            row.SalesOrderId,
            row.OrderNumber,
            ToOffset(row.OrderDate),
            row.OrderTotal,
            row.AmountPaid,
            row.Outstanding)).ToList();
    }

    private static DateTimeOffset ToOffset(DateTime value) =>
        new(DateTime.SpecifyKind(value, DateTimeKind.Utc));

    private sealed record LineRow
    {
        public Guid SalesOrderId { get; init; }
        public string OrderNumber { get; init; } = "";
        public DateTime OrderDate { get; init; }
        public decimal OrderTotal { get; init; }
        public decimal AmountPaid { get; init; }
        public decimal Outstanding { get; init; }
    }
}
