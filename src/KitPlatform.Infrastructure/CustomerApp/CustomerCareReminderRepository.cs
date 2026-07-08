using Dapper;
using KitPlatform.Infrastructure.Data;

namespace KitPlatform.Infrastructure.CustomerApp;

internal sealed class CustomerCareReminderRepository
{
    private readonly IDbConnectionFactory _db;

    public CustomerCareReminderRepository(IDbConnectionFactory db) => _db = db;

    public async Task<IReadOnlyList<CustomerCareReminderRow>> ListAsync(
        Guid tenantId,
        Guid accountId,
        bool includeDone,
        CancellationToken cancellationToken)
    {
        const string sql = """
            SELECT
                id AS Id,
                family_member_id AS FamilyMemberId,
                health_record_id AS HealthRecordId,
                reminder_type AS ReminderType,
                title AS Title,
                note AS Note,
                remind_at AS RemindAt,
                is_done AS IsDone,
                done_at AS DoneAt,
                snoozed_until AS SnoozedUntil,
                created_at AS CreatedAt,
                updated_at AS UpdatedAt
            FROM care_reminders
            WHERE tenant_id = @TenantId
              AND account_id = @AccountId
              AND (@IncludeDone = TRUE OR is_done = FALSE)
            ORDER BY remind_at ASC, created_at DESC
            """;

        await using var conn = await _db.CreateOpenConnectionAsync(cancellationToken);
        return (await conn.QueryAsync<CustomerCareReminderRow>(sql, new
        {
            TenantId = tenantId,
            AccountId = accountId,
            IncludeDone = includeDone,
        })).ToList();
    }

    public async Task<CustomerCareReminderRow?> GetAsync(
        Guid tenantId,
        Guid accountId,
        Guid careReminderId,
        CancellationToken cancellationToken)
    {
        const string sql = """
            SELECT
                id AS Id,
                family_member_id AS FamilyMemberId,
                health_record_id AS HealthRecordId,
                reminder_type AS ReminderType,
                title AS Title,
                note AS Note,
                remind_at AS RemindAt,
                is_done AS IsDone,
                done_at AS DoneAt,
                snoozed_until AS SnoozedUntil,
                created_at AS CreatedAt,
                updated_at AS UpdatedAt
            FROM care_reminders
            WHERE id = @CareReminderId
              AND tenant_id = @TenantId
              AND account_id = @AccountId
            """;

        await using var conn = await _db.CreateOpenConnectionAsync(cancellationToken);
        return await conn.QuerySingleOrDefaultAsync<CustomerCareReminderRow>(sql, new
        {
            CareReminderId = careReminderId,
            TenantId = tenantId,
            AccountId = accountId,
        });
    }

    public async Task<Guid> CreateAsync(
        Guid tenantId,
        Guid accountId,
        Guid? familyMemberId,
        Guid? healthRecordId,
        string reminderType,
        string title,
        string? note,
        DateTimeOffset remindAt,
        CancellationToken cancellationToken)
    {
        const string sql = """
            INSERT INTO care_reminders (
                tenant_id,
                account_id,
                family_member_id,
                health_record_id,
                reminder_type,
                title,
                note,
                remind_at
            )
            VALUES (
                @TenantId,
                @AccountId,
                @FamilyMemberId,
                @HealthRecordId,
                @ReminderType,
                @Title,
                @Note,
                @RemindAt
            )
            RETURNING id
            """;

        await using var conn = await _db.CreateOpenConnectionAsync(cancellationToken);
        return await conn.ExecuteScalarAsync<Guid>(sql, new
        {
            TenantId = tenantId,
            AccountId = accountId,
            FamilyMemberId = familyMemberId,
            HealthRecordId = healthRecordId,
            ReminderType = reminderType,
            Title = title,
            Note = note,
            RemindAt = remindAt.UtcDateTime,
        });
    }

    public async Task<bool> UpdateAsync(
        Guid tenantId,
        Guid accountId,
        Guid careReminderId,
        Guid? familyMemberId,
        Guid? healthRecordId,
        string reminderType,
        string title,
        string? note,
        DateTimeOffset remindAt,
        bool isDone,
        DateTimeOffset? snoozedUntil,
        CancellationToken cancellationToken)
    {
        const string sql = """
            UPDATE care_reminders
            SET family_member_id = @FamilyMemberId,
                health_record_id = @HealthRecordId,
                reminder_type = @ReminderType,
                title = @Title,
                note = @Note,
                remind_at = @RemindAt,
                is_done = @IsDone,
                done_at = CASE WHEN @IsDone = TRUE THEN COALESCE(done_at, NOW()) ELSE NULL END,
                snoozed_until = @SnoozedUntil,
                updated_at = NOW()
            WHERE id = @CareReminderId
              AND tenant_id = @TenantId
              AND account_id = @AccountId
            """;

        await using var conn = await _db.CreateOpenConnectionAsync(cancellationToken);
        var rows = await conn.ExecuteAsync(sql, new
        {
            CareReminderId = careReminderId,
            TenantId = tenantId,
            AccountId = accountId,
            FamilyMemberId = familyMemberId,
            HealthRecordId = healthRecordId,
            ReminderType = reminderType,
            Title = title,
            Note = note,
            RemindAt = remindAt.UtcDateTime,
            IsDone = isDone,
            SnoozedUntil = snoozedUntil?.UtcDateTime,
        });
        return rows > 0;
    }

    public async Task<bool> DeleteAsync(
        Guid tenantId,
        Guid accountId,
        Guid careReminderId,
        CancellationToken cancellationToken)
    {
        const string sql = """
            DELETE FROM care_reminders
            WHERE id = @CareReminderId
              AND tenant_id = @TenantId
              AND account_id = @AccountId
            """;

        await using var conn = await _db.CreateOpenConnectionAsync(cancellationToken);
        var rows = await conn.ExecuteAsync(sql, new
        {
            CareReminderId = careReminderId,
            TenantId = tenantId,
            AccountId = accountId,
        });
        return rows > 0;
    }
}

internal sealed class CustomerCareReminderRow
{
    public Guid Id { get; set; }
    public Guid? FamilyMemberId { get; set; }
    public Guid? HealthRecordId { get; set; }
    public string ReminderType { get; set; } = "";
    public string Title { get; set; } = "";
    public string? Note { get; set; }
    public DateTime RemindAt { get; set; }
    public bool IsDone { get; set; }
    public DateTime? DoneAt { get; set; }
    public DateTime? SnoozedUntil { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
