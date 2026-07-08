namespace KitPlatform.Application.Core;

/// <summary>
/// Tenant feature flags — sync with <c>settings.platform.features</c> (migration 051 backfill).
/// </summary>
public static class PlatformFeatureCodes
{
    public const string BatchTracking = "batch_tracking";
    public const string NationalDrugCatalog = "national_drug_catalog";
    public const string OrderLevelRepurchase = "order_level_repurchase";
    public const string FamilyMembers = "family_members";
    public const string BranchPriceOverrides = "branch_price_overrides";
    public const string BranchProductListings = "branch_product_listings";

    public static IReadOnlyList<string> All { get; } =
    [
        BatchTracking,
        NationalDrugCatalog,
        OrderLevelRepurchase,
        FamilyMembers,
        BranchPriceOverrides,
        BranchProductListings,
    ];
}
