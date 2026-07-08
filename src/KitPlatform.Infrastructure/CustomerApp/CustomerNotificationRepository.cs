using Dapper;
using KitPlatform.Application.Core.Engines;
using KitPlatform.Infrastructure.Data;

namespace KitPlatform.Infrastructure.CustomerApp;

internal sealed class CustomerNotificationRepository
{
    private readonly IDbConnectionFactory _db;
    private readonly INotificationEngine _notifications;

    public CustomerNotificationRepository(
        IDbConnectionFactory db,
        INotificationEngine notifications)
    {
        _db = db;
        _notifications = notifications;
    }

    public async Task<IReadOnlyList<CustomerNotificationRow>> ListAsync(
        Guid tenantId,
        Guid customerId,
        int limit,
        CancellationToken cancellationToken)
    {
        const string sql = """
            SELECT
                id AS Id,
                category AS Category,
                title AS Title,
                body AS Body,
                href AS Href,
                read_at AS ReadAt,
                created_at AS CreatedAt
            FROM customer_notifications
            WHERE tenant_id = @TenantId
              AND customer_id = @CustomerId
            ORDER BY created_at DESC
            LIMIT @Limit
            """;

        await using var conn = await _db.CreateOpenConnectionAsync(cancellationToken);
        return (await conn.QueryAsync<CustomerNotificationRow>(sql, new
        {
            TenantId = tenantId,
            CustomerId = customerId,
            Limit = Math.Clamp(limit, 1, 100),
        })).ToList();
    }

    public async Task<int> CountUnreadAsync(
        Guid tenantId,
        Guid customerId,
        CancellationToken cancellationToken)
    {
        const string sql = """
            SELECT COUNT(*)::int
            FROM customer_notifications
            WHERE tenant_id = @TenantId
              AND customer_id = @CustomerId
              AND read_at IS NULL
            """;

        await using var conn = await _db.CreateOpenConnectionAsync(cancellationToken);
        return await conn.ExecuteScalarAsync<int>(sql, new { TenantId = tenantId, CustomerId = customerId });
    }

    public async Task<bool> MarkReadAsync(
        Guid tenantId,
        Guid customerId,
        Guid notificationId,
        CancellationToken cancellationToken)
    {
        const string sql = """
            UPDATE customer_notifications
            SET read_at = COALESCE(read_at, NOW())
            WHERE id = @Id
              AND tenant_id = @TenantId
              AND customer_id = @CustomerId
            """;

        await using var conn = await _db.CreateOpenConnectionAsync(cancellationToken);
        return await conn.ExecuteAsync(sql, new
        {
            Id = notificationId,
            TenantId = tenantId,
            CustomerId = customerId,
        }) > 0;
    }

    public async Task MarkAllReadAsync(
        Guid tenantId,
        Guid customerId,
        CancellationToken cancellationToken)
    {
        const string sql = """
            UPDATE customer_notifications
            SET read_at = NOW()
            WHERE tenant_id = @TenantId
              AND customer_id = @CustomerId
              AND read_at IS NULL
            """;

        await using var conn = await _db.CreateOpenConnectionAsync(cancellationToken);
        await conn.ExecuteAsync(sql, new { TenantId = tenantId, CustomerId = customerId });
    }

    public Task InsertAsync(
        Guid tenantId,
        Guid customerId,
        short channel,
        string category,
        string title,
        string body,
        string? href,
        string payloadJson,
        CancellationToken cancellationToken) =>
        _notifications.EnqueueCustomerNotificationAsync(
            tenantId,
            customerId,
            channel,
            category,
            title,
            body,
            href,
            payloadJson,
            cancellationToken);
}

internal sealed class CustomerNotificationRow
{
    public Guid Id { get; set; }
    public string Category { get; set; } = "system";
    public string Title { get; set; } = "";
    public string Body { get; set; } = "";
    public string? Href { get; set; }
    public DateTime? ReadAt { get; set; }
    public DateTime CreatedAt { get; set; }
}
