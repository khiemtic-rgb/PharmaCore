using System.Data;
using KitPlatform.Application.Abstractions;
using KitPlatform.Application.Platform.Events;
using KitPlatform.Infrastructure.Data;
using KitPlatform.Infrastructure.Kernel.Event;

namespace KitPlatform.Infrastructure.Platform.Events;

internal sealed class PlatformEventWriter : IPlatformEventWriter
{
    private readonly ITenantContext _tenant;
    private readonly IDbConnectionFactory _db;

    public PlatformEventWriter(ITenantContext tenant, IDbConnectionFactory db)
    {
        _tenant = tenant;
        _db = db;
    }

    public Task WriteAsync(
        IDbConnection conn,
        IDbTransaction tx,
        string eventType,
        string aggregateType,
        Guid aggregateId,
        object data,
        Guid? actorUserId = null,
        Guid? correlationId = null,
        string source = PlatformEventSources.PharmacyPack,
        CancellationToken cancellationToken = default) =>
        PlatformEventDualWrite.WriteAsync(
            conn,
            tx,
            _tenant.TenantId,
            eventType,
            aggregateType,
            aggregateId,
            data,
            source,
            actorUserId ?? (_tenant.IsAuthenticated ? _tenant.UserId : null),
            correlationId,
            _tenant.WorkspaceId,
            cancellationToken);

    public Task WriteForTenantAsync(
        IDbConnection conn,
        IDbTransaction tx,
        Guid tenantId,
        string eventType,
        string aggregateType,
        Guid aggregateId,
        object data,
        Guid? actorUserId = null,
        Guid? correlationId = null,
        string source = PlatformEventSources.PharmacyPack,
        CancellationToken cancellationToken = default) =>
        PlatformEventDualWrite.WriteAsync(
            conn,
            tx,
            tenantId,
            eventType,
            aggregateType,
            aggregateId,
            data,
            source,
            actorUserId,
            correlationId,
            workspaceId: null,
            cancellationToken);

    public async Task PublishForTenantAsync(
        Guid tenantId,
        string eventType,
        string aggregateType,
        Guid aggregateId,
        object data,
        Guid? actorUserId = null,
        Guid? correlationId = null,
        string source = PlatformEventSources.PharmacyPack,
        CancellationToken cancellationToken = default)
    {
        await using var conn = await _db.CreateOpenConnectionAsync(cancellationToken);
        await using var tx = await conn.BeginTransactionAsync(cancellationToken);
        await PlatformEventDualWrite.WriteAsync(
            conn,
            tx,
            tenantId,
            eventType,
            aggregateType,
            aggregateId,
            data,
            source,
            actorUserId,
            correlationId,
            workspaceId: null,
            cancellationToken);
        await tx.CommitAsync(cancellationToken);
    }
}
