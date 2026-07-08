using System.Data;

namespace KitPlatform.Application.Integration;

public interface IIntegrationOutboxWriter
{
    Task WriteAsync(
        IDbConnection conn,
        IDbTransaction tx,
        string eventType,
        string aggregateType,
        Guid aggregateId,
        object data,
        Guid? actorUserId,
        CancellationToken cancellationToken = default);
}
