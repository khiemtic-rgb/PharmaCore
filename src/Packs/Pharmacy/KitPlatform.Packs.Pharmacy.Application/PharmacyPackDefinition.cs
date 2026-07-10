namespace KitPlatform.Packs.Pharmacy;

/// <summary>Novixa Pharmacy Pack — metadata for provisioning, smoke, and pack-scoped code.</summary>
public static class PharmacyPackDefinition
{
    public const string PackCode = "pharmacy";
    /// <summary>Matches <c>kit_tenant.tenant_package.package_code</c> for workspace resolution.</summary>
    public const string TenantPackageCode = "novixa_pharmacy";
    public const string DisplayName = "Novixa Pharmacy Pack";
    public const string EventSource = "pack:pharmacy";

    public static IReadOnlyList<string> DefaultEnabledModules { get; } =
    [
        "inventory",
        "procurement",
        "sales",
        "loyalty",
        "customer_app",
        "medication",
        "health_wallet",
        "reservations",
        "reports",
        "e_rx",
        "prescriber_network",
        "prescriber_portal",
    ];

    public static IReadOnlyList<string> PackModuleCodes { get; } =
    [
        "medication",
        "health_wallet",
        "reservations",
        "e_rx",
        "prescriber_network",
        "prescriber_portal",
    ];
}
