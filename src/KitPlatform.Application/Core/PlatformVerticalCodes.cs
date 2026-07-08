namespace KitPlatform.Application.Core;

/// <summary>Sync with <c>ck_tenants_business_vertical</c> (migration 051).</summary>
public static class PlatformVerticalCodes
{
    public const string Pharmacy = "pharmacy";
    public const string PharmacyChain = "pharmacy_chain";
    public const string SupplementStore = "supplement_store";
    public const string MedicalEquipmentStore = "medical_equipment_store";
    public const string Clinic = "clinic";
    public const string Lab = "lab";
    public const string MedicalSpa = "medical_spa";
    public const string Hybrid = "hybrid";

    public static IReadOnlyList<string> All { get; } =
    [
        Pharmacy,
        PharmacyChain,
        SupplementStore,
        MedicalEquipmentStore,
        Clinic,
        Lab,
        MedicalSpa,
        Hybrid,
    ];
}
