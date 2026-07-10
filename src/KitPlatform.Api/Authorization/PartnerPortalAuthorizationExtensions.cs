using Microsoft.AspNetCore.Authorization;
using KitPlatform.Packs.Survey;

namespace KitPlatform.Api.Authorization;

public static class PartnerPortalPolicies
{
    public const string Authenticated = "PartnerPortal";
}

public static class PartnerPortalAuthorizationExtensions
{
    public static void AddPartnerPortalAuthorization(this AuthorizationOptions options)
    {
        options.AddPolicy(PartnerPortalPolicies.Authenticated, policy =>
            policy.RequireClaim(
                PartnerPortalAuthConstants.TokenTypeClaim,
                PartnerPortalAuthConstants.TokenTypeValue));
    }
}
