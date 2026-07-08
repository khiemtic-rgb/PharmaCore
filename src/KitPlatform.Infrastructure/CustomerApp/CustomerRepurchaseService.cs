using KitPlatform.Application.CustomerApp;

namespace KitPlatform.Infrastructure.CustomerApp;

internal sealed class CustomerRepurchaseService : ICustomerRepurchaseService
{
    private readonly CustomerRepurchaseRepository _repo;

    public CustomerRepurchaseService(CustomerRepurchaseRepository repo) => _repo = repo;

    public async Task<CustomerRepurchaseSuggestionListResult> ListAsync(
        Guid tenantId,
        Guid customerId,
        Guid accountId,
        CancellationToken cancellationToken = default)
    {
        var rows = await _repo.ListAsync(tenantId, customerId, accountId, cancellationToken);
        return new CustomerRepurchaseSuggestionListResult(rows.Select(MapRow).ToList());
    }

    public async Task<CustomerRepurchaseSuggestionDto?> AcceptAsync(
        Guid tenantId,
        Guid customerId,
        Guid accountId,
        Guid suggestionId,
        AcceptRepurchaseSuggestionRequest? request = null,
        CancellationToken cancellationToken = default)
    {
        var remindTime = ParseRemindTime(request?.RemindTime);
        await _repo.AcceptAsync(
            tenantId,
            customerId,
            accountId,
            suggestionId,
            request?.FamilyMemberId,
            remindTime,
            DateTimeOffset.UtcNow.AddHours(1),
            cancellationToken);

        var row = await _repo.GetAsync(tenantId, customerId, accountId, suggestionId, cancellationToken);
        return row is null ? null : MapRow(row);
    }

    public async Task<CustomerRepurchaseSuggestionDto?> DismissAsync(
        Guid tenantId,
        Guid customerId,
        Guid accountId,
        Guid suggestionId,
        CancellationToken cancellationToken = default)
    {
        var ok = await _repo.UpdateStatusAsync(
            tenantId,
            customerId,
            accountId,
            suggestionId,
            "dismissed",
            null,
            setDismissedAt: true,
            cancellationToken);
        if (!ok)
            return null;

        var row = await _repo.GetAsync(tenantId, customerId, accountId, suggestionId, cancellationToken);
        return row is null ? null : MapRow(row);
    }

    public async Task<CustomerRepurchaseSuggestionDto?> SnoozeAsync(
        Guid tenantId,
        Guid customerId,
        Guid accountId,
        Guid suggestionId,
        DateTimeOffset snoozedUntil,
        CancellationToken cancellationToken = default)
    {
        if (snoozedUntil <= DateTimeOffset.UtcNow)
            throw new InvalidOperationException("Thời gian snooze phải ở tương lai.");

        var ok = await _repo.UpdateStatusAsync(
            tenantId,
            customerId,
            accountId,
            suggestionId,
            "snoozed",
            snoozedUntil,
            setDismissedAt: false,
            cancellationToken);
        if (!ok)
            return null;

        var row = await _repo.GetAsync(tenantId, customerId, accountId, suggestionId, cancellationToken);
        return row is null ? null : MapRow(row);
    }

    private static TimeOnly ParseRemindTime(string? value)
    {
        if (!string.IsNullOrWhiteSpace(value) && TimeOnly.TryParse(value, out var parsed))
            return parsed;
        return new TimeOnly(8, 0);
    }

    private static CustomerRepurchaseSuggestionDto MapRow(CustomerRepurchaseSuggestionRow row) =>
        new(
            row.Id,
            row.SalesOrderId,
            row.SalesOrderItemId,
            row.OrderNumber,
            row.OrderLabel,
            row.Status,
            new DateTimeOffset(DateTime.SpecifyKind(row.OrderDate, DateTimeKind.Utc)),
            row.ReminderDaysSupply,
            row.SuggestedForDate,
            row.SnoozedUntil.HasValue
                ? new DateTimeOffset(DateTime.SpecifyKind(row.SnoozedUntil.Value, DateTimeKind.Utc))
                : null,
            row.DrinkRemindersCreatedAt.HasValue
                ? new DateTimeOffset(DateTime.SpecifyKind(row.DrinkRemindersCreatedAt.Value, DateTimeKind.Utc))
                : null,
            new DateTimeOffset(DateTime.SpecifyKind(row.CreatedAt, DateTimeKind.Utc)),
            new DateTimeOffset(DateTime.SpecifyKind(row.UpdatedAt, DateTimeKind.Utc)));
}
