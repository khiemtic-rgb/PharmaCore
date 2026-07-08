using System.Data;
using Dapper;

namespace KitPlatform.Infrastructure.Kernel.Event;

/// <summary>
/// Strangler dual-write: legacy outbox tables + <c>kit_event.event_outbox</c> in the same transaction.
/// </summary>
internal static class KernelEventOutboxDualWriter
{
    public static Task WritePlatformEventAsync(
        IDbConnection conn,
        IDbTransaction tx,
        Guid tenantId,
        Guid platformEventId,
        string eventType,
        short eventVersion,
        string aggregateType,
        Guid aggregateId,
        string source,
        string payloadJson,
        DateTimeOffset occurredAt,
        Guid? createdBy = null,
        Guid? workspaceId = null,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            INSERT INTO kit_event.event_outbox (
                tenant_id, workspace_id, event_bus, event_type, event_version, aggregate_type, aggregate_id,
                source, payload, occurred_at, legacy_platform_event_id, created_by, updated_by
            )
            VALUES (
                @TenantId, @WorkspaceId, 'platform', @EventType, @EventVersion, @AggregateType, @AggregateId,
                @Source, @Payload::jsonb, @OccurredAt, @LegacyPlatformEventId, @CreatedBy, @CreatedBy
            )
            ON CONFLICT (legacy_platform_event_id) WHERE legacy_platform_event_id IS NOT NULL
            DO NOTHING
            """;

        return conn.ExecuteAsync(new CommandDefinition(sql, new
        {
            TenantId = tenantId,
            WorkspaceId = workspaceId,
            EventType = eventType,
            EventVersion = eventVersion,
            AggregateType = aggregateType,
            AggregateId = aggregateId,
            Source = source,
            Payload = payloadJson,
            OccurredAt = occurredAt.UtcDateTime,
            LegacyPlatformEventId = platformEventId,
            CreatedBy = createdBy,
        }, tx, cancellationToken: cancellationToken));
    }

    public static Task WriteIntegrationEventAsync(
        IDbConnection conn,
        IDbTransaction tx,
        Guid tenantId,
        Guid integrationOutboxId,
        string eventType,
        short eventVersion,
        string aggregateType,
        Guid aggregateId,
        string payloadJson,
        DateTimeOffset occurredAt,
        Guid? createdBy = null,
        Guid? workspaceId = null,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            INSERT INTO kit_event.event_outbox (
                tenant_id, workspace_id, event_bus, event_type, event_version, aggregate_type, aggregate_id,
                source, payload, occurred_at, legacy_outbox_id, created_by, updated_by
            )
            VALUES (
                @TenantId, @WorkspaceId, 'integration', @EventType, @EventVersion, @AggregateType, @AggregateId,
                'integration:cdp', @Payload::jsonb, @OccurredAt, @LegacyOutboxId, @CreatedBy, @CreatedBy
            )
            ON CONFLICT (legacy_outbox_id) WHERE legacy_outbox_id IS NOT NULL
            DO NOTHING
            """;

        return conn.ExecuteAsync(new CommandDefinition(sql, new
        {
            TenantId = tenantId,
            WorkspaceId = workspaceId,
            EventType = eventType,
            EventVersion = eventVersion,
            AggregateType = aggregateType,
            AggregateId = aggregateId,
            Payload = payloadJson,
            OccurredAt = occurredAt.UtcDateTime,
            LegacyOutboxId = integrationOutboxId,
            CreatedBy = createdBy,
        }, tx, cancellationToken: cancellationToken));
    }

    public static Task MarkPlatformEventDispatchedAsync(
        IDbConnection conn,
        IDbTransaction tx,
        Guid platformEventId,
        string? lastError,
        bool success,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            UPDATE kit_event.event_outbox
            SET dispatched_at = CASE WHEN @Success THEN NOW() ELSE dispatched_at END,
                dispatch_attempts = dispatch_attempts + 1,
                last_error = @LastError,
                updated_at = NOW()
            WHERE legacy_platform_event_id = @LegacyPlatformEventId
            """;

        return conn.ExecuteAsync(new CommandDefinition(sql, new
        {
            LegacyPlatformEventId = platformEventId,
            LastError = lastError,
            Success = success,
        }, tx, cancellationToken: cancellationToken));
    }

    public static Task MarkIntegrationEventDispatchedAsync(
        IDbConnection conn,
        IDbTransaction tx,
        Guid integrationOutboxId,
        string? lastError,
        bool success,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            UPDATE kit_event.event_outbox
            SET dispatched_at = CASE WHEN @Success THEN NOW() ELSE dispatched_at END,
                dispatch_attempts = dispatch_attempts + 1,
                last_error = @LastError,
                updated_at = NOW()
            WHERE legacy_outbox_id = @LegacyOutboxId
            """;

        return conn.ExecuteAsync(new CommandDefinition(sql, new
        {
            LegacyOutboxId = integrationOutboxId,
            LastError = lastError,
            Success = success,
        }, tx, cancellationToken: cancellationToken));
    }
}
