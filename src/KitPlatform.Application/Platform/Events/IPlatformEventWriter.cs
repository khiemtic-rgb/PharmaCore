using System.Data;

namespace KitPlatform.Application.Platform.Events;

public interface IPlatformEventWriter
{
    Task WriteAsync(
        IDbConnection conn,
        IDbTransaction tx,
        string eventType,
        string aggregateType,
        Guid aggregateId,
        object data,
        Guid? actorUserId = null,
        Guid? correlationId = null,
        string source = PlatformEventSources.PharmacyPack,
        CancellationToken cancellationToken = default);

    /// <summary>Write event for an explicit tenant (prescriber portal, cross-tenant flows).</summary>
    Task WriteForTenantAsync(
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
        CancellationToken cancellationToken = default);

    /// <summary>Standalone publish (opens own transaction) — for cross-tenant channels e.g. prescriber portal.</summary>
    Task PublishForTenantAsync(
        Guid tenantId,
        string eventType,
        string aggregateType,
        Guid aggregateId,
        object data,
        Guid? actorUserId = null,
        Guid? correlationId = null,
        string source = PlatformEventSources.PharmacyPack,
        CancellationToken cancellationToken = default);
}
