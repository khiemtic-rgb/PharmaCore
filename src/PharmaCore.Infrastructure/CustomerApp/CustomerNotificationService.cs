using PharmaCore.Application.CustomerApp;

namespace PharmaCore.Infrastructure.CustomerApp;

internal sealed class CustomerNotificationService : ICustomerNotificationService
{
    private readonly CustomerNotificationRepository _repo;

    public CustomerNotificationService(CustomerNotificationRepository repo) => _repo = repo;

    public async Task<CustomerNotificationListResult> ListAsync(
        Guid tenantId,
        Guid customerId,
        int limit = 50,
        CancellationToken cancellationToken = default)
    {
        var rows = await _repo.ListAsync(tenantId, customerId, limit, cancellationToken);
        var unread = await _repo.CountUnreadAsync(tenantId, customerId, cancellationToken);
        return new CustomerNotificationListResult(
            rows.Select(MapRow).ToList(),
            unread);
    }

    public Task<bool> MarkReadAsync(
        Guid tenantId,
        Guid customerId,
        Guid notificationId,
        CancellationToken cancellationToken = default) =>
        _repo.MarkReadAsync(tenantId, customerId, notificationId, cancellationToken);

    public Task MarkAllReadAsync(
        Guid tenantId,
        Guid customerId,
        CancellationToken cancellationToken = default) =>
        _repo.MarkAllReadAsync(tenantId, customerId, cancellationToken);

    private static CustomerNotificationDto MapRow(CustomerNotificationRow row) =>
        new(
            row.Id,
            row.Category,
            row.Title,
            row.Body,
            row.Href,
            row.ReadAt.HasValue
                ? new DateTimeOffset(DateTime.SpecifyKind(row.ReadAt.Value, DateTimeKind.Utc))
                : null,
            new DateTimeOffset(DateTime.SpecifyKind(row.CreatedAt, DateTimeKind.Utc)));
}
