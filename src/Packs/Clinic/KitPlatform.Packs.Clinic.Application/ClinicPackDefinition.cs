namespace KitPlatform.Packs.Clinic;

/// <summary>Clinic + CRM Pack 2 pilot — metadata only; tables in <c>pack_clinic</c> / <c>pack_crm</c>.</summary>
public static class ClinicPackDefinition
{
    public const string PackCode = "clinic_crm";
    public const string DisplayName = "Clinic + CRM Pack (pilot)";

    public static IReadOnlyList<string> DefaultEnabledModules { get; } =
    [
        "inventory",
        "sales",
        "customer_app",
        "clinic_appointments",
        "clinic_emr_lite",
        "crm_leads",
        "reports",
    ];

    public static IReadOnlyList<string> PackModuleCodes { get; } =
    [
        "clinic_appointments",
        "clinic_emr_lite",
        "crm_leads",
    ];
}
