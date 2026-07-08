using System.Text.Json;
using Dapper;
using KitPlatform.Application.Abstractions;
using KitPlatform.Infrastructure.Data;
using KitPlatform.Infrastructure.Kernel.Audit;

namespace KitPlatform.Infrastructure.Security;

internal sealed class AuditLogRepository
{
    private readonly IDbConnectionFactory _db;
    private readonly ITenantContext _tenant;

    public AuditLogRepository(IDbConnectionFactory db, ITenantContext tenant)
    {
        _db = db;
        _tenant = tenant;
    }

    public async Task WriteAsync(
        string entityType,
        Guid? entityId,
        string action,
        object? payload,
        CancellationToken cancellationToken)
    {
        const string sql = """
            INSERT INTO audit_logs (tenant_id, user_id, entity_type, entity_id, action, payload)
            VALUES (@TenantId, @UserId, @EntityType, @EntityId, @Action, @Payload::jsonb)
            RETURNING id
            """;
        var payloadJson = payload is null
            ? null
            : JsonSerializer.Serialize(payload);
        var actorUserId = _tenant.IsAuthenticated ? _tenant.UserId : (Guid?)null;

        await using var conn = await _db.CreateOpenConnectionAsync(cancellationToken);
        await using var tx = await conn.BeginTransactionAsync(cancellationToken);

        var auditLogId = await conn.QuerySingleAsync<Guid>(sql, new
        {
            TenantId = _tenant.TenantId,
            UserId = actorUserId,
            EntityType = entityType,
            EntityId = entityId,
            Action = action,
            Payload = payloadJson,
        }, tx);

        await KernelAuditDualWriter.WriteAsync(
            conn,
            tx,
            _tenant.TenantId,
            auditLogId,
            actorUserId,
            entityType,
            entityId,
            action,
            payloadJson,
            _tenant.WorkspaceId,
            cancellationToken);

        await tx.CommitAsync(cancellationToken);
    }
}

internal sealed class AuditLogService : IAuditLogService
{
    private readonly AuditLogRepository _repository;

    public AuditLogService(AuditLogRepository repository) => _repository = repository;

    public Task WriteAsync(
        string entityType,
        Guid? entityId,
        string action,
        object? payload = null,
        CancellationToken cancellationToken = default) =>
        _repository.WriteAsync(entityType, entityId, action, payload, cancellationToken);
}
