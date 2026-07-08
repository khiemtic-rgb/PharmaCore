namespace KitPlatform.Application.CustomerApp;

public sealed record CustomerHealthRecordDto(
    Guid Id,
    Guid? FamilyMemberId,
    string RecordType,
    string Title,
    string? Summary,
    string? ProviderName,
    DateTimeOffset RecordedAt,
    string AttachmentsJson,
    string MetadataJson,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);

public sealed record CustomerHealthRecordListResult(IReadOnlyList<CustomerHealthRecordDto> Items);

public sealed record CreateCustomerHealthRecordRequest(
    Guid? FamilyMemberId,
    string RecordType,
    string Title,
    string? Summary,
    string? ProviderName,
    DateTimeOffset RecordedAt,
    string? AttachmentsJson,
    string? MetadataJson);

public sealed record UpdateCustomerHealthRecordRequest(
    Guid? FamilyMemberId,
    string RecordType,
    string Title,
    string? Summary,
    string? ProviderName,
    DateTimeOffset RecordedAt,
    string? AttachmentsJson,
    string? MetadataJson);

public interface ICustomerHealthService
{
    Task<CustomerHealthRecordListResult> ListAsync(
        Guid tenantId,
        Guid accountId,
        CancellationToken cancellationToken = default);

    Task<CustomerHealthRecordDto?> GetAsync(
        Guid tenantId,
        Guid accountId,
        Guid healthRecordId,
        CancellationToken cancellationToken = default);

    Task<CustomerHealthRecordDto> CreateAsync(
        Guid tenantId,
        Guid accountId,
        CreateCustomerHealthRecordRequest request,
        CancellationToken cancellationToken = default);

    Task<CustomerHealthRecordDto?> UpdateAsync(
        Guid tenantId,
        Guid accountId,
        Guid healthRecordId,
        UpdateCustomerHealthRecordRequest request,
        CancellationToken cancellationToken = default);

    Task<bool> DeleteAsync(
        Guid tenantId,
        Guid accountId,
        Guid healthRecordId,
        CancellationToken cancellationToken = default);
}
