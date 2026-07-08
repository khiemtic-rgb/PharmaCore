using System.Data;
using System.Text.Json;
using Dapper;

namespace KitPlatform.Infrastructure.Kernel.Event;

/// <summary>
/// Writes <c>platform_events</c> + <c>kit_event.event_outbox</c> in one transaction (explicit tenant).
/// </summary>
internal static class PlatformEventDualWrite
{
    public static async Task WriteAsync(
        IDbConnection conn,
        IDbTransaction tx,
        Guid tenantId,
        string eventType,
        string aggregateType,
        Guid aggregateId,
        object data,
        string source,
        Guid? actorUserId = null,
        Guid? correlationId = null,
        Guid? workspaceId = null,
        CancellationToken cancellationToken = default)
    {
        var eventId = Guid.NewGuid();
        var occurredAt = DateTimeOffset.UtcNow;
        var envelope = new
        {
            eventId,
            eventType,
            eventVersion = 1,
            tenantId,
            occurredAt,
            source,
            aggregateType,
            aggregateId,
            actorUserId,
            correlationId,
            data,
        };
        var payloadJson = JsonSerializer.Serialize(envelope);

        const string sql = """
            INSERT INTO platform_events (
                id, tenant_id, event_type, event_version, aggregate_type, aggregate_id, source, payload
            )
            VALUES (
                @Id, @TenantId, @EventType, @EventVersion, @AggregateType, @AggregateId, @Source, @Payload::jsonb
            )
            """;

        await conn.ExecuteAsync(new CommandDefinition(sql, new
        {
            Id = eventId,
            TenantId = tenantId,
            EventType = eventType,
            EventVersion = (short)1,
            AggregateType = aggregateType,
            AggregateId = aggregateId,
            Source = source,
            Payload = payloadJson,
        }, tx, cancellationToken: cancellationToken));

        await KernelEventOutboxDualWriter.WritePlatformEventAsync(
            conn,
            tx,
            tenantId,
            eventId,
            eventType,
            eventVersion: 1,
            aggregateType,
            aggregateId,
            source,
            payloadJson,
            occurredAt,
            actorUserId,
            workspaceId,
            cancellationToken);
    }
}
