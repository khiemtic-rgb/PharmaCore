namespace KitPlatform.Application.CustomerApp;

public interface ICustomerCatalogService
{
    Task<CustomerProductSearchResult> SearchProductsAsync(
        Guid tenantId,
        string? search,
        int page = 1,
        int pageSize = 20,
        CancellationToken cancellationToken = default);
}
