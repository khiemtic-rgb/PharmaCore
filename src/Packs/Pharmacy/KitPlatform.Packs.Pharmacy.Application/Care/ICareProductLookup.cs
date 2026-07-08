namespace KitPlatform.Packs.Pharmacy.Care;

/// <summary>Read-only product summary for Care/AI (Master Data / Medication boundary).</summary>
public interface ICareProductLookup
{
    Task<CareProductSummaryDto?> GetProductAsync(
        Guid tenantId,
        Guid productId,
        CancellationToken cancellationToken = default);
}
