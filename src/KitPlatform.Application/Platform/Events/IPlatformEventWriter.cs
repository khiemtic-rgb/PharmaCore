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
}
