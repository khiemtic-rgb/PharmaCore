using Dapper;
using KitPlatform.Infrastructure.Data;

namespace KitPlatform.Infrastructure.CustomerApp;

internal sealed class CustomerEngagementRepository
{
    private readonly IDbConnectionFactory _db;

    public CustomerEngagementRepository(IDbConnectionFactory db) => _db = db;

    public async Task<Guid?> GetCustomerIdForAccountAsync(
        Guid tenantId,
        Guid accountId,
        CancellationToken cancellationToken)
    {
        const string sql = """
            SELECT customer_id
            FROM customer_accounts
            WHERE tenant_id = @TenantId
              AND id = @AccountId
              AND status = 1
            """;

        await using var conn = await _db.CreateOpenConnectionAsync(cancellationToken);
        return await conn.ExecuteScalarAsync<Guid?>(sql, new { TenantId = tenantId, AccountId = accountId });
    }

    public async Task<IReadOnlyList<CareReminderDispatchRow>> ListCareRemindersForAdvanceNoticeAsync(
        int limit,
        CancellationToken cancellationToken)
    {
        const string sql = """
            SELECT
                cr.id AS CareReminderId,
                cr.tenant_id AS TenantId,
                ca.customer_id AS CustomerId,
                cr.account_id AS AccountId,
                cr.title AS Title,
                cr.note AS Note,
                cr.reminder_type AS ReminderType,
                cr.remind_at AS RemindAt,
                fm.full_name AS FamilyMemberName,
                ca.device_tokens::text AS DeviceTokensJson
            FROM care_reminders cr
            INNER JOIN customer_accounts ca
                ON ca.id = cr.account_id
               AND ca.tenant_id = cr.tenant_id
               AND ca.status = 1
            LEFT JOIN family_members fm
                ON fm.id = cr.family_member_id
               AND fm.tenant_id = cr.tenant_id
            WHERE cr.is_done = FALSE
              AND cr.remind_at > NOW()
              AND cr.remind_at <= NOW() + INTERVAL '24 hours'
              AND cr.advance_notified_at IS NULL
              AND (cr.snoozed_until IS NULL OR cr.snoozed_until <= NOW())
            ORDER BY cr.remind_at
            LIMIT @Limit
            """;

        await using var conn = await _db.CreateOpenConnectionAsync(cancellationToken);
        return (await conn.QueryAsync<CareReminderDispatchRow>(sql, new { Limit = limit })).ToList();
    }

    public async Task<IReadOnlyList<CareReminderDispatchRow>> ListCareRemindersDueAsync(
        int limit,
        CancellationToken cancellationToken)
    {
        const string sql = """
            SELECT
                cr.id AS CareReminderId,
                cr.tenant_id AS TenantId,
                ca.customer_id AS CustomerId,
                cr.account_id AS AccountId,
                cr.title AS Title,
                cr.note AS Note,
                cr.reminder_type AS ReminderType,
                cr.remind_at AS RemindAt,
                fm.full_name AS FamilyMemberName,
                ca.device_tokens::text AS DeviceTokensJson
            FROM care_reminders cr
            INNER JOIN customer_accounts ca
                ON ca.id = cr.account_id
               AND ca.tenant_id = cr.tenant_id
               AND ca.status = 1
            LEFT JOIN family_members fm
                ON fm.id = cr.family_member_id
               AND fm.tenant_id = cr.tenant_id
            WHERE cr.is_done = FALSE
              AND cr.remind_at <= NOW()
              AND (cr.snoozed_until IS NULL OR cr.snoozed_until <= NOW())
              AND cr.due_notified_at IS NULL
            ORDER BY cr.remind_at
            LIMIT @Limit
            """;

        await using var conn = await _db.CreateOpenConnectionAsync(cancellationToken);
        return (await conn.QueryAsync<CareReminderDispatchRow>(sql, new { Limit = limit })).ToList();
    }

    public async Task MarkCareReminderAdvanceNotifiedAsync(
        Guid tenantId,
        Guid careReminderId,
        CancellationToken cancellationToken)
    {
        const string sql = """
            UPDATE care_reminders
            SET advance_notified_at = NOW(), updated_at = NOW()
            WHERE id = @CareReminderId AND tenant_id = @TenantId
            """;
        await using var conn = await _db.CreateOpenConnectionAsync(cancellationToken);
        await conn.ExecuteAsync(sql, new { CareReminderId = careReminderId, TenantId = tenantId });
    }

    public async Task MarkCareReminderDueNotifiedAsync(
        Guid tenantId,
        Guid careReminderId,
        CancellationToken cancellationToken)
    {
        const string sql = """
            UPDATE care_reminders
            SET due_notified_at = NOW(), updated_at = NOW()
            WHERE id = @CareReminderId AND tenant_id = @TenantId
            """;
        await using var conn = await _db.CreateOpenConnectionAsync(cancellationToken);
        await conn.ExecuteAsync(sql, new { CareReminderId = careReminderId, TenantId = tenantId });
    }

    public async Task<IReadOnlyList<RepurchaseDispatchRow>> ListRepurchaseDueAsync(
        int limit,
        CancellationToken cancellationToken)
    {
        const string sql = """
            SELECT
                rs.id AS RepurchaseId,
                rs.tenant_id AS TenantId,
                rs.customer_id AS CustomerId,
                rs.customer_account_id AS AccountId,
                rs.order_label AS OrderLabel,
                rs.suggested_for_date AS SuggestedForDate,
                ca.device_tokens::text AS DeviceTokensJson
            FROM repurchase_suggestions rs
            INNER JOIN customer_accounts ca
                ON ca.id = rs.customer_account_id
               AND ca.tenant_id = rs.tenant_id
               AND ca.status = 1
            WHERE rs.notified_at IS NULL
              AND (
                  (rs.status = 'pending'
                   AND rs.suggested_for_date IS NOT NULL
                   AND rs.suggested_for_date <= (NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date)
                  OR (rs.status = 'snoozed'
                      AND rs.snoozed_until IS NOT NULL
                      AND rs.snoozed_until <= NOW())
              )
            ORDER BY rs.suggested_for_date NULLS LAST, rs.created_at
            LIMIT @Limit
            """;

        await using var conn = await _db.CreateOpenConnectionAsync(cancellationToken);
        return (await conn.QueryAsync<RepurchaseDispatchRow>(sql, new { Limit = limit })).ToList();
    }

    public async Task MarkRepurchaseNotifiedAsync(
        Guid tenantId,
        Guid repurchaseId,
        CancellationToken cancellationToken)
    {
        const string sql = """
            UPDATE repurchase_suggestions
            SET notified_at = NOW(), updated_at = NOW()
            WHERE id = @RepurchaseId AND tenant_id = @TenantId
            """;
        await using var conn = await _db.CreateOpenConnectionAsync(cancellationToken);
        await conn.ExecuteAsync(sql, new { RepurchaseId = repurchaseId, TenantId = tenantId });
    }

    public async Task<IReadOnlyList<AdherenceAlertDispatchRow>> ListMissedAdherenceCandidatesAsync(
        int limit,
        CancellationToken cancellationToken)
    {
        const string sql = """
            SELECT DISTINCT
                mr.tenant_id AS TenantId,
                mr.customer_id AS CustomerId,
                ca.id AS AccountId,
                ca.device_tokens::text AS DeviceTokensJson
            FROM medication_reminders mr
            INNER JOIN customer_accounts ca
                ON ca.customer_id = mr.customer_id
               AND ca.tenant_id = mr.tenant_id
               AND ca.status = 1
            WHERE mr.is_active = TRUE
              AND NOT EXISTS (
                  SELECT 1
                  FROM medication_adherence_events e
                  WHERE e.tenant_id = mr.tenant_id
                    AND e.customer_id = mr.customer_id
                    AND e.response = 'taken'
                    AND (e.scheduled_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
                        >= (NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date - 2
              )
              AND NOT EXISTS (
                  SELECT 1
                  FROM customer_adherence_alert_dispatches d
                  WHERE d.tenant_id = mr.tenant_id
                    AND d.customer_id = mr.customer_id
                    AND d.alert_date = (NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
              )
            LIMIT @Limit
            """;

        await using var conn = await _db.CreateOpenConnectionAsync(cancellationToken);
        return (await conn.QueryAsync<AdherenceAlertDispatchRow>(sql, new { Limit = limit })).ToList();
    }

    public async Task MarkAdherenceAlertDispatchedAsync(
        Guid tenantId,
        Guid customerId,
        CancellationToken cancellationToken)
    {
        const string sql = """
            INSERT INTO customer_adherence_alert_dispatches (tenant_id, customer_id, alert_date)
            VALUES (
                @TenantId,
                @CustomerId,
                (NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
            )
            ON CONFLICT DO NOTHING
            """;
        await using var conn = await _db.CreateOpenConnectionAsync(cancellationToken);
        await conn.ExecuteAsync(sql, new { TenantId = tenantId, CustomerId = customerId });
    }
}

internal sealed class CareReminderDispatchRow
{
    public Guid CareReminderId { get; set; }
    public Guid TenantId { get; set; }
    public Guid CustomerId { get; set; }
    public Guid AccountId { get; set; }
    public string Title { get; set; } = "";
    public string? Note { get; set; }
    public string ReminderType { get; set; } = "";
    public DateTime RemindAt { get; set; }
    public string? FamilyMemberName { get; set; }
    public string DeviceTokensJson { get; set; } = "[]";
}

internal sealed class RepurchaseDispatchRow
{
    public Guid RepurchaseId { get; set; }
    public Guid TenantId { get; set; }
    public Guid CustomerId { get; set; }
    public Guid AccountId { get; set; }
    public string OrderLabel { get; set; } = "";
    public DateOnly? SuggestedForDate { get; set; }
    public string DeviceTokensJson { get; set; } = "[]";
}

internal sealed class AdherenceAlertDispatchRow
{
    public Guid TenantId { get; set; }
    public Guid CustomerId { get; set; }
    public Guid AccountId { get; set; }
    public string DeviceTokensJson { get; set; } = "[]";
}
