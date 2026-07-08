namespace KitPlatform.Application.Core.Engines;

/// <summary>
/// Core Audit Engine (POL-AUDIT). Pilot: wraps <c>IAuditLogService</c>.
/// </summary>
public interface IAuditEngine
{
    Task WriteAsync(
        string entityType,
        Guid? entityId,
        string action,
        object? payload = null,
        CancellationToken cancellationToken = default);
}
