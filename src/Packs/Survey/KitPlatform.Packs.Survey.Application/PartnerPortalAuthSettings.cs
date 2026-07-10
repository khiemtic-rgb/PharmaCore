namespace KitPlatform.Packs.Survey;

public static class PartnerPortalAuthConstants
{
    public const string TokenTypeClaim = "token_type";
    public const string TokenTypeValue = "partner_portal";
    public const string PartnerIdClaim = "partner_id";
    public const string PartnerCodeClaim = "partner_code";
}

public sealed class PartnerPortalAuthSettings
{
    public const string SectionName = "PartnerPortalAuth";

    public string Audience { get; set; } = "KitPlatform.PartnerPortal";

    public int AccessTokenExpireMinutes { get; set; } = 60 * 12;
}
