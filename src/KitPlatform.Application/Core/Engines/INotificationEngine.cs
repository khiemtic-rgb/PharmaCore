namespace KitPlatform.Application.Core.Engines;

/// <summary>
/// Core Notification Engine (POL-NOTIFY). Enqueues via <c>kit_notify.notify_queue</c> with legacy dual-write.
/// </summary>
public interface INotificationEngine
{
    Task EnqueueCustomerNotificationAsync(
        Guid tenantId,
        Guid customerId,
        short legacyChannel,
        string category,
        string title,
        string body,
        string? href,
        string payloadJson,
        CancellationToken cancellationToken = default);

    Task EnqueueCustomerNotificationAsync(
        Guid tenantId,
        Guid customerId,
        string title,
        string body,
        string payloadJson,
        string category = "system",
        string? href = null,
        CancellationToken cancellationToken = default);
}
