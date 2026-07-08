namespace KitPlatform.Packs.Survey;

public sealed class AssessmentSettings
{
    public const string SectionName = "Assessment";

    public string SessionCookieName { get; set; } = "assessment_session";

    public int SessionMaxAgeDays { get; set; } = 7;

    /// <summary>Platform events require tenant_id — use this tenant for anonymous public leads.</summary>
    public string? EventTenantCode { get; set; } = "NVX-CS08";
}
