namespace PharmaCore.Application.CustomerApp;

public sealed record CustomerFamilyMemberDto(
    Guid Id,
    Guid? LinkedCustomerId,
    string FullName,
    string? Phone,
    DateOnly? DateOfBirth,
    short? Gender,
    string Relationship,
    string? Notes,
    short Status,
    bool NotifyCaregiver,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);

public sealed record CustomerFamilyMemberListResult(IReadOnlyList<CustomerFamilyMemberDto> Items);

public sealed record CreateCustomerFamilyMemberRequest(
    Guid? LinkedCustomerId,
    string FullName,
    string? Phone,
    DateOnly? DateOfBirth,
    short? Gender,
    string Relationship,
    string? Notes,
    bool NotifyCaregiver = false);

public sealed record UpdateCustomerFamilyMemberRequest(
    Guid? LinkedCustomerId,
    string FullName,
    string? Phone,
    DateOnly? DateOfBirth,
    short? Gender,
    string Relationship,
    string? Notes,
    short Status,
    bool? NotifyCaregiver = null);

public sealed record SetFamilyNotifyCaregiverRequest(bool NotifyCaregiver);

public interface ICustomerFamilyService
{
    Task<CustomerFamilyMemberListResult> ListAsync(
        Guid tenantId,
        Guid accountId,
        CancellationToken cancellationToken = default);

    Task<CustomerFamilyMemberDto> CreateAsync(
        Guid tenantId,
        Guid accountId,
        CreateCustomerFamilyMemberRequest request,
        CancellationToken cancellationToken = default);

    Task<CustomerFamilyMemberDto?> UpdateAsync(
        Guid tenantId,
        Guid accountId,
        Guid familyMemberId,
        UpdateCustomerFamilyMemberRequest request,
        CancellationToken cancellationToken = default);

    Task<bool> DeleteAsync(
        Guid tenantId,
        Guid accountId,
        Guid familyMemberId,
        CancellationToken cancellationToken = default);

    Task<CustomerFamilyMemberDto?> SetNotifyCaregiverAsync(
        Guid tenantId,
        Guid accountId,
        Guid familyMemberId,
        bool notifyCaregiver,
        CancellationToken cancellationToken = default);
}
