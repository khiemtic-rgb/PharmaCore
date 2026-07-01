namespace PharmaCore.Application.CustomerApp;

public sealed record CustomerNotificationDto(
    Guid Id,
    string Category,
    string Title,
    string Body,
    string? Href,
    DateTimeOffset? ReadAt,
    DateTimeOffset CreatedAt);

public sealed record CustomerNotificationListResult(
    IReadOnlyList<CustomerNotificationDto> Items,
    int UnreadCount);

public interface ICustomerNotificationService
{
    Task<CustomerNotificationListResult> ListAsync(
        Guid tenantId,
        Guid customerId,
        int limit = 50,
        CancellationToken cancellationToken = default);

    Task<bool> MarkReadAsync(
        Guid tenantId,
        Guid customerId,
        Guid notificationId,
        CancellationToken cancellationToken = default);

    Task MarkAllReadAsync(
        Guid tenantId,
        Guid customerId,
        CancellationToken cancellationToken = default);
}
