using System.Data;
using System.Text.Json;
using Dapper;

namespace KitPlatform.Infrastructure.Kernel.Audit;

internal static class KernelAuditDualWriter
{
    public static async Task WriteAsync(
        IDbConnection conn,
        IDbTransaction? tx,
        Guid tenantId,
        Guid auditLogId,
        Guid? actorUserId,
        string entityType,
        Guid? entityId,
        string action,
        string? payloadJson,
        Guid? workspaceId = null,
        CancellationToken cancellationToken = default)
    {
        await WriteActivityLogAsync(
            conn,
            tx,
            tenantId,
            actorUserId,
            entityType,
            entityId,
            action,
            payloadJson,
            workspaceId,
            cancellationToken);

        if (string.IsNullOrWhiteSpace(payloadJson))
            return;

        await WriteChangeLogsAsync(
            conn,
            tx,
            tenantId,
            auditLogId,
            actorUserId,
            entityType,
            entityId,
            payloadJson,
            workspaceId,
            cancellationToken);
    }

    private static Task WriteActivityLogAsync(
        IDbConnection conn,
        IDbTransaction? tx,
        Guid tenantId,
        Guid? actorUserId,
        string entityType,
        Guid? entityId,
        string action,
        string? payloadJson,
        Guid? workspaceId,
        CancellationToken cancellationToken)
    {
        const string sql = """
            INSERT INTO kit_audit.activity_log (
                tenant_id, workspace_id, actor_user_id, actor_type, activity_type, activity_action,
                entity_type, entity_id, summary, metadata
            )
            VALUES (
                @TenantId, @WorkspaceId, @ActorUserId, 'user', @ActivityType, @ActivityAction,
                @EntityType, @EntityId, @Summary, COALESCE(@Metadata::jsonb, '{}'::jsonb)
            )
            """;

        return conn.ExecuteAsync(new CommandDefinition(sql, new
        {
            TenantId = tenantId,
            WorkspaceId = workspaceId,
            ActorUserId = actorUserId,
            ActivityType = entityType,
            ActivityAction = action,
            EntityType = entityType,
            EntityId = entityId,
            Summary = $"{entityType}.{action}",
            Metadata = payloadJson,
        }, tx, cancellationToken: cancellationToken));
    }

    private static async Task WriteChangeLogsAsync(
        IDbConnection conn,
        IDbTransaction? tx,
        Guid tenantId,
        Guid auditLogId,
        Guid? actorUserId,
        string entityType,
        Guid? entityId,
        string payloadJson,
        Guid? workspaceId,
        CancellationToken cancellationToken)
    {
        if (entityId is null)
            return;

        using var doc = JsonDocument.Parse(payloadJson);
        if (!doc.RootElement.TryGetProperty("changes", out var changesEl)
            || changesEl.ValueKind != JsonValueKind.Array)
        {
            return;
        }

        const string sql = """
            INSERT INTO kit_audit.change_log (
                tenant_id, workspace_id, actor_user_id, entity_type, entity_id,
                field_name, old_value, new_value, change_type, legacy_audit_id
            )
            VALUES (
                @TenantId, @WorkspaceId, @ActorUserId, @EntityType, @EntityId,
                @FieldName, @OldValue::jsonb, @NewValue::jsonb, @ChangeType, @LegacyAuditId
            )
            ON CONFLICT (legacy_audit_id, field_name) WHERE legacy_audit_id IS NOT NULL
            DO NOTHING
            """;

        foreach (var change in changesEl.EnumerateArray())
        {
            if (!change.TryGetProperty("field", out var fieldEl))
                continue;

            var fieldName = fieldEl.GetString();
            if (string.IsNullOrWhiteSpace(fieldName))
                continue;

            change.TryGetProperty("oldValue", out var oldEl);
            change.TryGetProperty("newValue", out var newEl);
            var changeType = change.TryGetProperty("changeType", out var typeEl)
                ? typeEl.GetString() ?? "update"
                : "update";

            await conn.ExecuteAsync(new CommandDefinition(sql, new
            {
                TenantId = tenantId,
                WorkspaceId = workspaceId,
                ActorUserId = actorUserId,
                EntityType = entityType,
                EntityId = entityId.Value,
                FieldName = fieldName,
                OldValue = oldEl.ValueKind == JsonValueKind.Undefined ? null : oldEl.GetRawText(),
                NewValue = newEl.ValueKind == JsonValueKind.Undefined ? null : newEl.GetRawText(),
                ChangeType = changeType,
                LegacyAuditId = auditLogId,
            }, tx, cancellationToken: cancellationToken));
        }
    }
}
