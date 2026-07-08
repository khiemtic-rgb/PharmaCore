namespace KitPlatform.Application.CustomerApp;

public sealed record CustomerCareReminderDto(
    Guid Id,
    Guid? FamilyMemberId,
    Guid? HealthRecordId,
    string ReminderType,
    string Title,
    string? Note,
    DateTimeOffset RemindAt,
    bool IsDone,
    DateTimeOffset? DoneAt,
    DateTimeOffset? SnoozedUntil,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);

public sealed record CustomerCareReminderListResult(IReadOnlyList<CustomerCareReminderDto> Items);

public sealed record CreateCustomerCareReminderRequest(
    Guid? FamilyMemberId,
    Guid? HealthRecordId,
    string ReminderType,
    string Title,
    string? Note,
    DateTimeOffset RemindAt);

public sealed record UpdateCustomerCareReminderRequest(
    Guid? FamilyMemberId,
    Guid? HealthRecordId,
    string ReminderType,
    string Title,
    string? Note,
    DateTimeOffset RemindAt,
    bool IsDone,
    DateTimeOffset? SnoozedUntil);

public interface ICustomerCareReminderService
{
    Task<CustomerCareReminderListResult> ListAsync(
        Guid tenantId,
        Guid accountId,
        bool includeDone,
        CancellationToken cancellationToken = default);

    Task<CustomerCareReminderDto?> GetAsync(
        Guid tenantId,
        Guid accountId,
        Guid careReminderId,
        CancellationToken cancellationToken = default);

    Task<CustomerCareReminderDto> CreateAsync(
        Guid tenantId,
        Guid accountId,
        CreateCustomerCareReminderRequest request,
        CancellationToken cancellationToken = default);

    Task<CustomerCareReminderDto?> UpdateAsync(
        Guid tenantId,
        Guid accountId,
        Guid careReminderId,
        UpdateCustomerCareReminderRequest request,
        CancellationToken cancellationToken = default);

    Task<bool> DeleteAsync(
        Guid tenantId,
        Guid accountId,
        Guid careReminderId,
        CancellationToken cancellationToken = default);
}
