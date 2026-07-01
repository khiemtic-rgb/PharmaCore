namespace PharmaCore.Application.CustomerApp;

public sealed record CustomerRepurchaseSuggestionDto(
    Guid Id,
    Guid SalesOrderId,
    Guid? SalesOrderItemId,
    string OrderNumber,
    string OrderLabel,
    string Status,
    DateTimeOffset OrderDate,
    int? ReminderDaysSupply,
    DateOnly? SuggestedForDate,
    DateTimeOffset? SnoozedUntil,
    DateTimeOffset? DrinkRemindersCreatedAt,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);

public sealed record CustomerRepurchaseSuggestionListResult(IReadOnlyList<CustomerRepurchaseSuggestionDto> Items);

public sealed record SnoozeRepurchaseSuggestionRequest(DateTimeOffset SnoozedUntil);

public sealed record AcceptRepurchaseSuggestionRequest(
    Guid? FamilyMemberId = null,
    string? RemindTime = null);

public interface ICustomerRepurchaseService
{
    Task<CustomerRepurchaseSuggestionListResult> ListAsync(
        Guid tenantId,
        Guid customerId,
        Guid accountId,
        CancellationToken cancellationToken = default);

    Task<CustomerRepurchaseSuggestionDto?> AcceptAsync(
        Guid tenantId,
        Guid customerId,
        Guid accountId,
        Guid suggestionId,
        AcceptRepurchaseSuggestionRequest? request = null,
        CancellationToken cancellationToken = default);

    Task<CustomerRepurchaseSuggestionDto?> DismissAsync(
        Guid tenantId,
        Guid customerId,
        Guid accountId,
        Guid suggestionId,
        CancellationToken cancellationToken = default);

    Task<CustomerRepurchaseSuggestionDto?> SnoozeAsync(
        Guid tenantId,
        Guid customerId,
        Guid accountId,
        Guid suggestionId,
        DateTimeOffset snoozedUntil,
        CancellationToken cancellationToken = default);
}
