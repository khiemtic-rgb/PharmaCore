using KitPlatform.Application.Abstractions;
using KitPlatform.Application.Core.Engines;

namespace KitPlatform.Infrastructure.Core.Engines;

internal sealed class AuditEngine : IAuditEngine
{
    private readonly IAuditLogService _audit;

    public AuditEngine(IAuditLogService audit) => _audit = audit;

    public Task WriteAsync(
        string entityType,
        Guid? entityId,
        string action,
        object? payload = null,
        CancellationToken cancellationToken = default)
        => _audit.WriteAsync(entityType, entityId, action, payload, cancellationToken);
}
