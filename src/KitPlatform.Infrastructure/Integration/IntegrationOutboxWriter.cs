using System.Data;
using System.Text.Json;
using Dapper;
using KitPlatform.Application.Abstractions;
using KitPlatform.Application.Integration;
using KitPlatform.Infrastructure.Kernel.Event;

namespace KitPlatform.Infrastructure.Integration;

internal sealed class IntegrationOutboxWriter : IIntegrationOutboxWriter
{
    private readonly ITenantContext _tenant;

    public IntegrationOutboxWriter(ITenantContext tenant) => _tenant = tenant;

    public async Task WriteAsync(
        IDbConnection conn,
        IDbTransaction tx,
        string eventType,
        string aggregateType,
        Guid aggregateId,
        object data,
        Guid? actorUserId,
        CancellationToken cancellationToken = default)
    {
        var occurredAt = DateTimeOffset.UtcNow;
        var eventId = Guid.NewGuid();
        var envelope = new
        {
            eventId,
            eventType,
            eventVersion = 1,
            tenantId = _tenant.TenantId,
            occurredAt,
            actorUserId,
            data,
        };
        var payloadJson = JsonSerializer.Serialize(envelope);

        const string sql = """
            INSERT INTO integration_outbox (
                id, tenant_id, event_type, event_version, aggregate_type, aggregate_id, payload
            )
            VALUES (
                @Id, @TenantId, @EventType, @EventVersion, @AggregateType, @AggregateId, @Payload::jsonb
            )
            """;
        await conn.ExecuteAsync(new CommandDefinition(sql, new
        {
            Id = eventId,
            TenantId = _tenant.TenantId,
            EventType = eventType,
            EventVersion = (short)1,
            AggregateType = aggregateType,
            AggregateId = aggregateId,
            Payload = payloadJson,
        }, tx, cancellationToken: cancellationToken));

        await KernelEventOutboxDualWriter.WriteIntegrationEventAsync(
            conn,
            tx,
            _tenant.TenantId,
            eventId,
            eventType,
            eventVersion: 1,
            aggregateType,
            aggregateId,
            payloadJson,
            occurredAt,
            actorUserId ?? (_tenant.IsAuthenticated ? _tenant.UserId : null),
            _tenant.WorkspaceId,
            cancellationToken);
    }
}
