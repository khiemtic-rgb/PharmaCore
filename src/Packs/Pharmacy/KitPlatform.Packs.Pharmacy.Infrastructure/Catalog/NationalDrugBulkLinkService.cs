using KitPlatform.Packs.Pharmacy.Catalog;

namespace KitPlatform.Packs.Pharmacy.Infrastructure;

public interface INationalDrugBulkLinkService
{
    Task<BulkNationalLinkResult> ApplySuggestionsAsync(int limit, CancellationToken cancellationToken = default);
}

internal sealed class NationalDrugBulkLinkService : INationalDrugBulkLinkService
{
    private readonly CatalogRepository _catalog;
    private readonly ICatalogService _products;
    private readonly INationalDrugCatalogService _nationalDrugs;

    public NationalDrugBulkLinkService(
        CatalogRepository catalog,
        ICatalogService products,
        INationalDrugCatalogService nationalDrugs)
    {
        _catalog = catalog;
        _products = products;
        _nationalDrugs = nationalDrugs;
    }

    public async Task<BulkNationalLinkResult> ApplySuggestionsAsync(
        int limit,
        CancellationToken cancellationToken = default)
    {
        var candidates = await _catalog.ListProductsMissingNationalRegAsync(limit, cancellationToken);
        var updated = 0;
        var skipped = 0;

        foreach (var candidate in candidates)
        {
            var query = !string.IsNullOrWhiteSpace(candidate.GenericName)
                ? candidate.GenericName
                : candidate.ProductName;
            var search = await _nationalDrugs.SearchAsync(query, 1, 5, cancellationToken);
            var match = search.Items.FirstOrDefault(item =>
                NamesLikelyMatch(candidate.ProductName, item.ProductName)
                || (!string.IsNullOrWhiteSpace(candidate.GenericName)
                    && NamesLikelyMatch(candidate.GenericName!, item.ActiveIngredient ?? item.ProductName)));

            if (match is null || string.IsNullOrWhiteSpace(match.DrugId))
            {
                skipped++;
                continue;
            }

            var prefill = await _nationalDrugs.BuildProductPrefillAsync(match.DrugId, cancellationToken);
            if (prefill is null)
            {
                skipped++;
                continue;
            }

            var detail = await _products.GetProductAsync(candidate.Id, cancellationToken);
            if (detail is null)
            {
                skipped++;
                continue;
            }

            var patch = new UpdateProductRequest
            {
                ProductName = detail.ProductName,
                GenericName = prefill.GenericName ?? detail.GenericName,
                DrugType = prefill.DrugType > 0 ? prefill.DrugType : detail.DrugType,
                CategoryId = detail.CategoryId,
                BrandId = detail.BrandId,
                Description = prefill.Description ?? detail.Description,
                NationalDrugId = prefill.DrugId ?? detail.NationalDrugId,
                NationalRegistrationNumber = prefill.RegistrationNumber ?? detail.NationalRegistrationNumber,
                DosageForm = match.DosageForm ?? detail.DosageForm,
                Packaging = detail.Packaging,
                ImporterName = detail.ImporterName,
                Status = detail.Status,
                MinStockQty = detail.MinStockQty,
                SaleUnitName = detail.SaleUnitName ?? prefill.SaleUnitName,
            };

            var result = await _products.UpdateProductAsync(candidate.Id, patch, cancellationToken);
            if (result is null)
                skipped++;
            else
                updated++;
        }

        return new BulkNationalLinkResult(candidates.Count, updated, skipped);
    }

    private static bool NamesLikelyMatch(string left, string right)
    {
        var a = NormalizeName(left);
        var b = NormalizeName(right);
        if (string.IsNullOrEmpty(a) || string.IsNullOrEmpty(b))
            return false;
        return a == b || a.Contains(b, StringComparison.Ordinal) || b.Contains(a, StringComparison.Ordinal);
    }

    private static string NormalizeName(string value) =>
        new string(value.Trim().ToLowerInvariant().Where(ch => !char.IsWhiteSpace(ch) && ch != '-').ToArray());
}
