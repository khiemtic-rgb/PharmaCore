using System.Data;
using KitPlatform.Application.Abstractions;
using KitPlatform.Application.Platform.Events;
using KitPlatform.Infrastructure.Kernel.Event;

namespace KitPlatform.Infrastructure.Platform.Events;

internal sealed class PlatformEventWriter : IPlatformEventWriter
{
    private readonly ITenantContext _tenant;

    public PlatformEventWriter(ITenantContext tenant) => _tenant = tenant;

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
}
