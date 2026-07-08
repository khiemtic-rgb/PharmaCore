using System.Text.Json;
using Dapper;
using KitPlatform.Application.Abstractions;
using KitPlatform.Application.Core.Engines;
using KitPlatform.Infrastructure.Data;

namespace KitPlatform.Infrastructure.Core.Engines;

internal sealed class NotificationEngine : INotificationEngine
{
    private readonly IDbConnectionFactory _db;
    private readonly ITenantContext _tenant;

    public NotificationEngine(IDbConnectionFactory db, ITenantContext tenant)
    {
        _db = db;
        _tenant = tenant;
    }

    public Task EnqueueCustomerNotificationAsync(
        Guid tenantId,
        Guid customerId,
        string title,
        string body,
        string payloadJson,
        string category = "system",
        string? href = null,
        CancellationToken cancellationToken = default) =>
        EnqueueCustomerNotificationAsync(
            tenantId,
            customerId,
            legacyChannel: 1,
            category,
            title,
            body,
            href,
            payloadJson,
            cancellationToken);

    public async Task EnqueueCustomerNotificationAsync(
        Guid tenantId,
        Guid customerId,
        short legacyChannel,
        string category,
        string title,
        string body,
        string? href,
        string payloadJson,
        CancellationToken cancellationToken)
    {
        var notifyChannel = MapLegacyChannel(legacyChannel);

        await using var conn = await _db.CreateOpenConnectionAsync(cancellationToken);
        await using var tx = await conn.BeginTransactionAsync(cancellationToken);

        const string legacySql = """
            INSERT INTO customer_notifications (
                tenant_id, customer_id, channel, category, title, body, href, payload, sent_at
            )
            VALUES (
                @TenantId, @CustomerId, @Channel, @Category, @Title, @Body, @Href, @Payload::jsonb, NOW()
            )
            RETURNING id
            """;

        var legacyId = await conn.QuerySingleAsync<Guid>(legacySql, new
        {
            TenantId = tenantId,
            CustomerId = customerId,
            Channel = legacyChannel,
            Category = category,
            Title = title,
            Body = body,
            Href = href,
            Payload = payloadJson,
        }, tx);

        var payload = ParsePayloadObject(payloadJson);
        var notificationId = Guid.NewGuid();
        var recipientId = Guid.NewGuid();
        var queueId = Guid.NewGuid();

        const string notificationSql = """
            INSERT INTO kit_notify.notify_notification (
                id, tenant_id, workspace_id, channel, title, body, payload, legacy_customer_notification_id
            )
            VALUES (
                @Id, @TenantId, @WorkspaceId, @Channel, @Title, @Body, @Payload::jsonb, @LegacyId
            )
            """;

        await conn.ExecuteAsync(notificationSql, new
        {
            Id = notificationId,
            TenantId = tenantId,
            WorkspaceId = _tenant.WorkspaceId,
            Channel = notifyChannel,
            Title = title,
            Body = body,
            Payload = payload,
            LegacyId = legacyId,
        }, tx);

        const string recipientSql = """
            INSERT INTO kit_notify.notify_recipient (
                id, tenant_id, notification_id, recipient_type, customer_id
            )
            VALUES (
                @Id, @TenantId, @NotificationId, 'customer', @CustomerId
            )
            """;

        await conn.ExecuteAsync(recipientSql, new
        {
            Id = recipientId,
            TenantId = tenantId,
            NotificationId = notificationId,
            CustomerId = customerId,
        }, tx);

        const string queueSql = """
            INSERT INTO kit_notify.notify_queue (
                id, tenant_id, workspace_id, notification_id, recipient_id, channel, scheduled_at, status
            )
            VALUES (
                @Id, @TenantId, @WorkspaceId, @NotificationId, @RecipientId, @Channel, NOW(), 1
            )
            """;

        await conn.ExecuteAsync(queueSql, new
        {
            Id = queueId,
            TenantId = tenantId,
            WorkspaceId = _tenant.WorkspaceId,
            NotificationId = notificationId,
            RecipientId = recipientId,
            Channel = notifyChannel,
        }, tx);

        await tx.CommitAsync(cancellationToken);
    }

    private static string MapLegacyChannel(short legacyChannel) =>
        legacyChannel switch
        {
            1 => "push",
            2 => "sms",
            3 => "email",
            _ => "in_app",
        };

    private static string ParsePayloadObject(string payloadJson)
    {
        if (string.IsNullOrWhiteSpace(payloadJson))
            return "{}";

        try
        {
            using var doc = JsonDocument.Parse(payloadJson);
            return doc.RootElement.ValueKind == JsonValueKind.Object
                ? payloadJson
                : JsonSerializer.Serialize(new { value = doc.RootElement });
        }
        catch (JsonException)
        {
            return JsonSerializer.Serialize(new { raw = payloadJson });
        }
    }
}
