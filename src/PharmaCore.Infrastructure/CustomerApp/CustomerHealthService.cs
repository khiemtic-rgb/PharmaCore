using PharmaCore.Application.CustomerApp;

namespace PharmaCore.Infrastructure.CustomerApp;

internal sealed class CustomerHealthService : ICustomerHealthService
{
    private static readonly HashSet<string> AllowedRecordTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "visit", "prescription", "lab", "allergy", "diagnosis", "note", "other",
        "bmi", "blood_pressure", "blood_glucose", "vaccination",
    };

    private readonly CustomerHealthRepository _repo;

    public CustomerHealthService(CustomerHealthRepository repo) => _repo = repo;

    public async Task<CustomerHealthRecordListResult> ListAsync(
        Guid tenantId,
        Guid accountId,
        CancellationToken cancellationToken = default)
    {
        var rows = await _repo.ListAsync(tenantId, accountId, cancellationToken);
        return new CustomerHealthRecordListResult(rows.Select(MapRow).ToList());
    }

    public async Task<CustomerHealthRecordDto?> GetAsync(
        Guid tenantId,
        Guid accountId,
        Guid healthRecordId,
        CancellationToken cancellationToken = default)
    {
        var row = await _repo.GetAsync(tenantId, accountId, healthRecordId, cancellationToken);
        return row is null ? null : MapRow(row);
    }

    public async Task<CustomerHealthRecordDto> CreateAsync(
        Guid tenantId,
        Guid accountId,
        CreateCustomerHealthRecordRequest request,
        CancellationToken cancellationToken = default)
    {
        var id = await _repo.CreateAsync(
            tenantId,
            accountId,
            request.FamilyMemberId,
            NormalizeRecordType(request.RecordType),
            NormalizeRequired(request.Title, "Tiêu đề"),
            NormalizeOptional(request.Summary),
            NormalizeOptional(request.ProviderName),
            request.RecordedAt,
            NormalizeJson(request.AttachmentsJson, "[]"),
            NormalizeJson(request.MetadataJson, "{}"),
            cancellationToken);

        var created = await _repo.GetAsync(tenantId, accountId, id, cancellationToken)
            ?? throw new InvalidOperationException("Không tạo được hồ sơ sức khỏe.");
        return MapRow(created);
    }

    public async Task<CustomerHealthRecordDto?> UpdateAsync(
        Guid tenantId,
        Guid accountId,
        Guid healthRecordId,
        UpdateCustomerHealthRecordRequest request,
        CancellationToken cancellationToken = default)
    {
        var updated = await _repo.UpdateAsync(
            tenantId,
            accountId,
            healthRecordId,
            request.FamilyMemberId,
            NormalizeRecordType(request.RecordType),
            NormalizeRequired(request.Title, "Tiêu đề"),
            NormalizeOptional(request.Summary),
            NormalizeOptional(request.ProviderName),
            request.RecordedAt,
            NormalizeJson(request.AttachmentsJson, "[]"),
            NormalizeJson(request.MetadataJson, "{}"),
            cancellationToken);

        if (!updated)
            return null;

        var row = await _repo.GetAsync(tenantId, accountId, healthRecordId, cancellationToken);
        return row is null ? null : MapRow(row);
    }

    public Task<bool> DeleteAsync(
        Guid tenantId,
        Guid accountId,
        Guid healthRecordId,
        CancellationToken cancellationToken = default) =>
        _repo.DeleteAsync(tenantId, accountId, healthRecordId, cancellationToken);

    private static string NormalizeRequired(string value, string fieldName)
    {
        var normalized = value?.Trim();
        if (string.IsNullOrWhiteSpace(normalized))
            throw new InvalidOperationException($"{fieldName} là bắt buộc.");
        return normalized;
    }

    private static string? NormalizeOptional(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static string NormalizeRecordType(string value)
    {
        var normalized = NormalizeRequired(value, "Loại hồ sơ").ToLowerInvariant();
        if (!AllowedRecordTypes.Contains(normalized))
            throw new InvalidOperationException("Loại hồ sơ không hợp lệ.");
        return normalized;
    }

    private static string NormalizeJson(string? value, string fallback) =>
        string.IsNullOrWhiteSpace(value) ? fallback : value.Trim();

    private static CustomerHealthRecordDto MapRow(CustomerHealthRecordRow row) =>
        new(
            row.Id,
            row.FamilyMemberId,
            row.RecordType,
            row.Title,
            row.Summary,
            row.ProviderName,
            new DateTimeOffset(DateTime.SpecifyKind(row.RecordedAt, DateTimeKind.Utc)),
            row.AttachmentsJson,
            row.MetadataJson,
            new DateTimeOffset(DateTime.SpecifyKind(row.CreatedAt, DateTimeKind.Utc)),
            new DateTimeOffset(DateTime.SpecifyKind(row.UpdatedAt, DateTimeKind.Utc)));
}
