namespace KitPlatform.Packs.Pharmacy.Catalog;

public sealed record SimilarProductNameDto(
    Guid Id,
    string ProductCode,
    string ProductName,
    double SimilarityScore);

public sealed record SimilarProductNamesResult(
    IReadOnlyList<SimilarProductNameDto> Matches,
    bool HasExactNormalizedMatch);
