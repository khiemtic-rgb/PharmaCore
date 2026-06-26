using PharmaCore.Application.CustomerApp;

namespace PharmaCore.Infrastructure.CustomerApp;

internal sealed class CustomerCatalogService : ICustomerCatalogService
{
    private readonly CustomerCatalogRepository _repo;

    public CustomerCatalogService(CustomerCatalogRepository repo) => _repo = repo;

    public async Task<CustomerProductSearchResult> SearchProductsAsync(
        Guid tenantId,
        string? search,
        int page = 1,
        int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        var (items, total) = await _repo.SearchProductsAsync(tenantId, search, page, pageSize, cancellationToken);
        return new CustomerProductSearchResult(items, total, Math.Max(1, page), Math.Clamp(pageSize, 1, 50));
    }
}
