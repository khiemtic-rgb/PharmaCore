using Dapper;
using PharmaCore.Infrastructure.Data;

namespace PharmaCore.Infrastructure.CustomerApp;

internal sealed class CustomerReminderRepository
{
    private readonly IDbConnectionFactory _db;

    public CustomerReminderRepository(IDbConnectionFactory db) => _db = db;

    public async Task<bool> ProductExistsAsync(Guid tenantId, Guid productId, CancellationToken cancellationToken)
    {
        const string sql = """
            SELECT EXISTS(
                SELECT 1 FROM products
                WHERE id = @ProductId AND tenant_id = @TenantId AND deleted_at IS NULL)
            """;

        await using var conn = await _db.CreateOpenConnectionAsync(cancellationToken);
        return await conn.ExecuteScalarAsync<bool>(sql, new { ProductId = productId, TenantId = tenantId });
    }

    public async Task<IReadOnlyList<MedicationReminderRow>> ListAsync(
        Guid tenantId,
        Guid customerId,
        bool includeInactive,
        CancellationToken cancellationToken)
    {
        const string sql = """
            SELECT
                mr.id AS Id,
                mr.product_id AS ProductId,
                p.product_code AS ProductCode,
                p.product_name AS ProductName,
                mr.dosage_note AS DosageNote,
                mr.remind_time AS RemindTime,
                mr.days_of_week AS DaysOfWeek,
                mr.next_remind_at AS NextRemindAt,
                mr.is_active AS IsActive,
                mr.created_at AS CreatedAt,
                mr.updated_at AS UpdatedAt
            FROM medication_reminders mr
            INNER JOIN products p ON p.id = mr.product_id AND p.tenant_id = @TenantId
            WHERE mr.tenant_id = @TenantId
              AND mr.customer_id = @CustomerId
              AND (@IncludeInactive = TRUE OR mr.is_active = TRUE)
            ORDER BY mr.created_at ASC, mr.id ASC
            """;

        await using var conn = await _db.CreateOpenConnectionAsync(cancellationToken);
        var rows = await conn.QueryAsync<MedicationReminderRow>(
            sql,
            new { TenantId = tenantId, CustomerId = customerId, IncludeInactive = includeInactive });
        return rows.AsList();
    }

    public async Task<MedicationReminderRow?> GetByIdAsync(
        Guid tenantId,
        Guid customerId,
        Guid reminderId,
        CancellationToken cancellationToken)
    {
        const string sql = """
            SELECT
                mr.id AS Id,
                mr.product_id AS ProductId,
                p.product_code AS ProductCode,
                p.product_name AS ProductName,
                mr.dosage_note AS DosageNote,
                mr.remind_time AS RemindTime,
                mr.days_of_week AS DaysOfWeek,
                mr.next_remind_at AS NextRemindAt,
                mr.is_active AS IsActive,
                mr.created_at AS CreatedAt,
                mr.updated_at AS UpdatedAt
            FROM medication_reminders mr
            INNER JOIN products p ON p.id = mr.product_id AND p.tenant_id = @TenantId
            WHERE mr.id = @ReminderId
              AND mr.tenant_id = @TenantId
              AND mr.customer_id = @CustomerId
            """;

        await using var conn = await _db.CreateOpenConnectionAsync(cancellationToken);
        return await conn.QuerySingleOrDefaultAsync<MedicationReminderRow>(
            sql,
            new { ReminderId = reminderId, TenantId = tenantId, CustomerId = customerId });
    }

    public async Task<Guid> CreateAsync(
        Guid tenantId,
        Guid customerId,
        Guid productId,
        string? dosageNote,
        TimeSpan remindTime,
        int[] daysOfWeek,
        DateTimeOffset? nextRemindAt,
        CancellationToken cancellationToken)
    {
        const string sql = """
            INSERT INTO medication_reminders (
                tenant_id,
                customer_id,
                product_id,
                dosage_note,
                remind_time,
                days_of_week,
                next_remind_at,
                is_active)
            VALUES (
                @TenantId,
                @CustomerId,
                @ProductId,
                @DosageNote,
                @RemindTime,
                @DaysOfWeek,
                @NextRemindAt,
                TRUE)
            RETURNING id
            """;

        await using var conn = await _db.CreateOpenConnectionAsync(cancellationToken);
        return await conn.ExecuteScalarAsync<Guid>(sql, new
        {
            TenantId = tenantId,
            CustomerId = customerId,
            ProductId = productId,
            DosageNote = dosageNote,
            RemindTime = remindTime,
            DaysOfWeek = daysOfWeek,
            NextRemindAt = nextRemindAt,
        });
    }

    public async Task<bool> UpdateAsync(
        Guid tenantId,
        Guid customerId,
        Guid reminderId,
        Guid productId,
        string? dosageNote,
        TimeSpan remindTime,
        int[] daysOfWeek,
        DateTimeOffset? nextRemindAt,
        bool isActive,
        CancellationToken cancellationToken)
    {
        const string sql = """
            UPDATE medication_reminders
            SET product_id = @ProductId,
                dosage_note = @DosageNote,
                remind_time = @RemindTime,
                days_of_week = @DaysOfWeek,
                next_remind_at = @NextRemindAt,
                is_active = @IsActive,
                updated_at = NOW()
            WHERE id = @ReminderId
              AND tenant_id = @TenantId
              AND customer_id = @CustomerId
            """;

        await using var conn = await _db.CreateOpenConnectionAsync(cancellationToken);
        var affected = await conn.ExecuteAsync(sql, new
        {
            ReminderId = reminderId,
            TenantId = tenantId,
            CustomerId = customerId,
            ProductId = productId,
            DosageNote = dosageNote,
            RemindTime = remindTime,
            DaysOfWeek = daysOfWeek,
            NextRemindAt = nextRemindAt,
            IsActive = isActive,
        });
        return affected > 0;
    }

    public async Task<bool> DeactivateAsync(
        Guid tenantId,
        Guid customerId,
        Guid reminderId,
        CancellationToken cancellationToken)
    {
        const string sql = """
            UPDATE medication_reminders
            SET is_active = FALSE,
                next_remind_at = NULL,
                updated_at = NOW()
            WHERE id = @ReminderId
              AND tenant_id = @TenantId
              AND customer_id = @CustomerId
              AND is_active = TRUE
            """;

        await using var conn = await _db.CreateOpenConnectionAsync(cancellationToken);
        var affected = await conn.ExecuteAsync(
            sql,
            new { ReminderId = reminderId, TenantId = tenantId, CustomerId = customerId });
        return affected > 0;
    }
}

/// <summary>Dapper map theo property — tránh lỗi constructor record với PG array.</summary>
internal sealed class MedicationReminderRow
{
    public Guid Id { get; set; }
    public Guid ProductId { get; set; }
    public string ProductCode { get; set; } = "";
    public string ProductName { get; set; } = "";
    public string? DosageNote { get; set; }
    public TimeOnly RemindTime { get; set; }
    public int[] DaysOfWeek { get; set; } = [];
    public DateTime? NextRemindAt { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
