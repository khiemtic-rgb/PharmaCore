namespace KitPlatform.Application.Loyalty;

public interface IVoucherAdminService
{
    Task<VoucherListResult> ListAsync(CancellationToken cancellationToken = default);

    Task<VoucherAdminDto?> GetAsync(Guid id, CancellationToken cancellationToken = default);

    Task<VoucherAdminDto> CreateAsync(UpsertVoucherRequest request, CancellationToken cancellationToken = default);

    Task<VoucherAdminDto> UpdateAsync(
        Guid id,
        UpsertVoucherRequest request,
        CancellationToken cancellationToken = default);

    Task IssueAsync(Guid voucherId, IssueVoucherRequest request, CancellationToken cancellationToken = default);

    Task<VoucherIssueCandidateListResult> SearchIssueCandidatesAsync(
        Guid voucherId,
        VoucherIssueCandidateSearchRequest request,
        CancellationToken cancellationToken = default);

    Task<IssueVoucherBulkResult> IssueBulkAsync(
        Guid voucherId,
        IssueVoucherBulkRequest request,
        CancellationToken cancellationToken = default);

    Task<IssuedCustomerVoucherListResult> ListIssuedAsync(
        Guid voucherId,
        CancellationToken cancellationToken = default);

    Task<(bool Ok, string? Error)> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
}
