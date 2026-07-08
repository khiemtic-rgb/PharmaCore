namespace KitPlatform.Application.CustomerApp;

public interface ICustomerLoyaltyService
{
    Task<CustomerLoyaltySummaryDto?> GetSummaryAsync(
        Guid tenantId,
        Guid customerId,
        CancellationToken cancellationToken = default);

    Task<PagedLoyaltyTransactionsResult> GetTransactionsAsync(
        Guid tenantId,
        Guid customerId,
        Guid? programId,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default);

    Task<LoyaltyProgramCatalogResult> GetProgramsAsync(
        Guid tenantId,
        Guid customerId,
        CancellationToken cancellationToken = default);

    Task<CustomerVoucherListResult> GetVouchersAsync(
        Guid tenantId,
        Guid customerId,
        bool includeUsed,
        CancellationToken cancellationToken = default);
}
