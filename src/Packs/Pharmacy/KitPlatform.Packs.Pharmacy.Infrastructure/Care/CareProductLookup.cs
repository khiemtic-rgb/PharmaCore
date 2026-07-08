using KitPlatform.Infrastructure.CustomerApp;
using KitPlatform.Packs.Pharmacy.Care;

namespace KitPlatform.Packs.Pharmacy.Infrastructure.Care;

internal sealed class CareProductLookup : ICareProductLookup
{
    private readonly CustomerCatalogRepository _catalog;

    public CareProductLookup(CustomerCatalogRepository catalog) => _catalog = catalog;

    public async Task<CareProductSummaryDto?> GetProductAsync(
        Guid tenantId,
        Guid productId,
        CancellationToken cancellationToken = default)
    {
        var row = await _catalog.GetByIdAsync(tenantId, productId, cancellationToken);
        return row is null
            ? null
            : new CareProductSummaryDto(row.Id, row.ProductName, row.GenericName);
    }
}
