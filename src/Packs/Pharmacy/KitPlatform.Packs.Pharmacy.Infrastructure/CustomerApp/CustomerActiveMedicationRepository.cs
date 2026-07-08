using Dapper;
using KitPlatform.Packs.Pharmacy.Sales;
using KitPlatform.Infrastructure.Data;

namespace KitPlatform.Packs.Pharmacy.Infrastructure.CustomerApp;

internal sealed class CustomerActiveMedicationRepository
{
    private readonly IDbConnectionFactory _db;

    public CustomerActiveMedicationRepository(IDbConnectionFactory db) => _db = db;

    public async Task<IReadOnlyList<ActiveMedicationOrderRow>> ListLatestOrderLinesAsync(
        Guid tenantId,
        Guid customerId,
        CancellationToken cancellationToken)
    {
        const string sql = """
            SELECT DISTINCT ON (i.product_id)
                i.product_id AS ProductId,
                p.product_code AS ProductCode,
                p.product_name AS ProductName,
                so.id AS SalesOrderId,
                so.order_number AS OrderNumber,
                so.order_date AS OrderDate,
                COALESCE(so.reminder_days_supply, 30) AS DaysSupply,
                (so.order_date + (COALESCE(so.reminder_days_supply, 30) || ' days')::interval)::date AS SupplyEndDate
            FROM sales_order_items i
            INNER JOIN sales_orders so ON so.id = i.sales_order_id
            INNER JOIN products p ON p.id = i.product_id AND p.tenant_id = @TenantId
            WHERE so.tenant_id = @TenantId
              AND so.customer_id = @CustomerId
              AND so.status IN (@Completed, @Refunded)
              AND p.deleted_at IS NULL
            ORDER BY i.product_id, so.order_date DESC
            """;

        await using var conn = await _db.CreateOpenConnectionAsync(cancellationToken);
        return (await conn.QueryAsync<ActiveMedicationOrderRow>(sql, new
        {
            TenantId = tenantId,
            CustomerId = customerId,
            Completed = SalesOrderStatuses.Completed,
            Refunded = SalesOrderStatuses.Refunded,
        })).ToList();
    }

    public async Task<IReadOnlyList<ActiveMedicationReminderRow>> ListActiveRemindersAsync(
        Guid tenantId,
        Guid customerId,
        CancellationToken cancellationToken)
    {
        const string sql = """
            SELECT
                mr.id AS Id,
                mr.product_id AS ProductId,
                p.product_code AS ProductCode,
                p.product_name AS ProductName,
                mr.family_member_id AS FamilyMemberId,
                mr.dosage_note AS DosageNote,
                mr.remind_time AS RemindTime,
                mr.created_at AS CreatedAt
            FROM medication_reminders mr
            INNER JOIN products p ON p.id = mr.product_id AND p.tenant_id = @TenantId
            WHERE mr.tenant_id = @TenantId
              AND mr.customer_id = @CustomerId
              AND mr.is_active = TRUE
            ORDER BY mr.created_at ASC
            """;

        await using var conn = await _db.CreateOpenConnectionAsync(cancellationToken);
        return (await conn.QueryAsync<ActiveMedicationReminderRow>(sql, new
        {
            TenantId = tenantId,
            CustomerId = customerId,
        })).ToList();
    }

    public async Task<IReadOnlyList<ActiveMedicationRepurchaseRow>> ListRepurchaseByProductAsync(
        Guid tenantId,
        Guid customerId,
        CancellationToken cancellationToken)
    {
        const string sql = """
            SELECT
                i.product_id AS ProductId,
                rs.suggested_for_date AS SuggestedForDate,
                rs.status AS Status,
                so.order_number AS OrderNumber,
                so.order_date AS OrderDate
            FROM repurchase_suggestions rs
            INNER JOIN sales_orders so ON so.id = rs.sales_order_id
            INNER JOIN sales_order_items i ON i.sales_order_id = so.id
            WHERE rs.tenant_id = @TenantId
              AND rs.customer_id = @CustomerId
              AND rs.status IN ('pending', 'snoozed')
            """;

        await using var conn = await _db.CreateOpenConnectionAsync(cancellationToken);
        return (await conn.QueryAsync<ActiveMedicationRepurchaseRow>(sql, new
        {
            TenantId = tenantId,
            CustomerId = customerId,
        })).ToList();
    }

    public async Task<IReadOnlyList<ActiveMedicationAdherenceRow>> ListAdherenceEventsAsync(
        Guid tenantId,
        Guid customerId,
        Guid? productId,
        CancellationToken cancellationToken)
    {
        const string sql = """
            SELECT
                e.product_id AS ProductId,
                e.response AS Response,
                e.scheduled_at AS ScheduledAt,
                e.created_at AS CreatedAt
            FROM medication_adherence_events e
            WHERE e.tenant_id = @TenantId
              AND e.customer_id = @CustomerId
              AND (@ProductId IS NULL OR e.product_id = @ProductId)
            ORDER BY e.created_at DESC
            LIMIT 50
            """;

        await using var conn = await _db.CreateOpenConnectionAsync(cancellationToken);
        return (await conn.QueryAsync<ActiveMedicationAdherenceRow>(sql, new
        {
            TenantId = tenantId,
            CustomerId = customerId,
            ProductId = productId,
        })).ToList();
    }

    internal sealed class ActiveMedicationOrderRow
    {
        public Guid ProductId { get; init; }
        public string ProductCode { get; init; } = "";
        public string ProductName { get; init; } = "";
        public Guid SalesOrderId { get; init; }
        public string OrderNumber { get; init; } = "";
        public DateTime OrderDate { get; init; }
        public int DaysSupply { get; init; }
        public DateOnly SupplyEndDate { get; init; }
    }

    internal sealed class ActiveMedicationReminderRow
    {
        public Guid Id { get; set; }
        public Guid ProductId { get; set; }
        public string ProductCode { get; set; } = "";
        public string ProductName { get; set; } = "";
        public Guid? FamilyMemberId { get; set; }
        public string? DosageNote { get; set; }
        public TimeOnly RemindTime { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    internal sealed class ActiveMedicationRepurchaseRow
    {
        public Guid ProductId { get; init; }
        public DateOnly? SuggestedForDate { get; init; }
        public string Status { get; init; } = "";
        public string OrderNumber { get; init; } = "";
        public DateTime OrderDate { get; init; }
    }

    internal sealed class ActiveMedicationAdherenceRow
    {
        public Guid ProductId { get; init; }
        public string Response { get; init; } = "";
        public DateTime ScheduledAt { get; init; }
        public DateTime CreatedAt { get; init; }
    }
}
