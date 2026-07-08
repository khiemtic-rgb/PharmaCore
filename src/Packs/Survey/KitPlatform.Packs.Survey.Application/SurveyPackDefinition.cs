namespace KitPlatform.Packs.Survey;

/// <summary>
/// Pharmacy Survey Pack — đánh giá / khảo sát nhà thuốc (Assessment Engine).
/// Legacy tables in <c>public.assessment_*</c>; strangler views in <c>pack_survey</c>.
/// </summary>
public static class SurveyPackDefinition
{
    public const string PackCode = "pharmacy_survey";
    public const string DisplayName = "Pharmacy Survey Pack";
    public const string EventSource = "pack:survey";

    public static IReadOnlyList<string> DefaultEnabledModules { get; } =
    [
        "assessment",
        "pharmacy_survey",
        "reports",
    ];

    public static IReadOnlyList<string> PackModuleCodes { get; } =
    [
        "assessment",
        "pharmacy_survey",
    ];
}
