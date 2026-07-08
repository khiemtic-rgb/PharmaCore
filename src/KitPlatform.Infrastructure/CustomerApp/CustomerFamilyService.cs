using KitPlatform.Application.CustomerApp;

namespace KitPlatform.Infrastructure.CustomerApp;

internal sealed class CustomerFamilyService : ICustomerFamilyService
{
    private static readonly HashSet<string> AllowedRelationships = new(StringComparer.OrdinalIgnoreCase)
    {
        "parent", "child", "spouse", "sibling", "other",
    };

    private readonly CustomerFamilyRepository _repo;

    public CustomerFamilyService(CustomerFamilyRepository repo) => _repo = repo;

    public async Task<CustomerFamilyMemberListResult> ListAsync(
        Guid tenantId,
        Guid accountId,
        CancellationToken cancellationToken = default)
    {
        var rows = await _repo.ListAsync(tenantId, accountId, cancellationToken);
        return new CustomerFamilyMemberListResult(rows.Select(MapRow).ToList());
    }

    public async Task<CustomerFamilyMemberDto> CreateAsync(
        Guid tenantId,
        Guid accountId,
        CreateCustomerFamilyMemberRequest request,
        CancellationToken cancellationToken = default)
    {
        var relationship = NormalizeRelationship(request.Relationship);
        var id = await _repo.CreateAsync(
            tenantId,
            accountId,
            request.LinkedCustomerId,
            NormalizeRequired(request.FullName, "Họ tên"),
            NormalizeOptional(request.Phone),
            request.DateOfBirth,
            request.Gender,
            relationship,
            NormalizeOptional(request.Notes),
            request.NotifyCaregiver,
            cancellationToken);

        var created = await _repo.GetAsync(tenantId, accountId, id, cancellationToken)
            ?? throw new InvalidOperationException("Không tạo được người thân.");
        return MapRow(created);
    }

    public async Task<CustomerFamilyMemberDto?> UpdateAsync(
        Guid tenantId,
        Guid accountId,
        Guid familyMemberId,
        UpdateCustomerFamilyMemberRequest request,
        CancellationToken cancellationToken = default)
    {
        var existing = await _repo.GetAsync(tenantId, accountId, familyMemberId, cancellationToken);
        if (existing is null)
            return null;

        var updated = await _repo.UpdateAsync(
            tenantId,
            accountId,
            familyMemberId,
            request.LinkedCustomerId,
            NormalizeRequired(request.FullName, "Họ tên"),
            NormalizeOptional(request.Phone),
            request.DateOfBirth,
            request.Gender,
            NormalizeRelationship(request.Relationship),
            NormalizeOptional(request.Notes),
            request.Status,
            request.NotifyCaregiver ?? existing.NotifyCaregiver,
            cancellationToken);

        if (!updated)
            return null;

        var row = await _repo.GetAsync(tenantId, accountId, familyMemberId, cancellationToken);
        return row is null ? null : MapRow(row);
    }

    public Task<bool> DeleteAsync(
        Guid tenantId,
        Guid accountId,
        Guid familyMemberId,
        CancellationToken cancellationToken = default) =>
        _repo.DeleteAsync(tenantId, accountId, familyMemberId, cancellationToken);

    public async Task<CustomerFamilyMemberDto?> SetNotifyCaregiverAsync(
        Guid tenantId,
        Guid accountId,
        Guid familyMemberId,
        bool notifyCaregiver,
        CancellationToken cancellationToken = default)
    {
        var updated = await _repo.SetNotifyCaregiverAsync(
            tenantId,
            accountId,
            familyMemberId,
            notifyCaregiver,
            cancellationToken);
        if (!updated)
            return null;

        var row = await _repo.GetAsync(tenantId, accountId, familyMemberId, cancellationToken);
        return row is null ? null : MapRow(row);
    }

    private static string NormalizeRelationship(string value)
    {
        var relation = NormalizeRequired(value, "Quan hệ").ToLowerInvariant();
        if (!AllowedRelationships.Contains(relation))
            throw new InvalidOperationException("Quan hệ không hợp lệ.");
        return relation;
    }

    private static string NormalizeRequired(string value, string fieldName)
    {
        var normalized = value?.Trim();
        if (string.IsNullOrWhiteSpace(normalized))
            throw new InvalidOperationException($"{fieldName} là bắt buộc.");
        return normalized;
    }

    private static string? NormalizeOptional(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static CustomerFamilyMemberDto MapRow(CustomerFamilyMemberRow row) =>
        new(
            row.Id,
            row.LinkedCustomerId,
            row.FullName,
            row.Phone,
            row.DateOfBirth,
            row.Gender,
            row.Relationship,
            row.Notes,
            row.Status,
            row.NotifyCaregiver,
            new DateTimeOffset(DateTime.SpecifyKind(row.CreatedAt, DateTimeKind.Utc)),
            new DateTimeOffset(DateTime.SpecifyKind(row.UpdatedAt, DateTimeKind.Utc)));
}
