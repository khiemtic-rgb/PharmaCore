using Microsoft.AspNetCore.Authorization;
using KitPlatform.Packs.Pharmacy.Rx;

namespace KitPlatform.Api.Authorization;

public static class PrescriberPortalPolicies
{
    public const string Authenticated = "PrescriberPortal";
}

public static class PrescriberPortalAuthorizationExtensions
{
    public static void AddPrescriberPortalAuthorization(this AuthorizationOptions options)
    {
        options.AddPolicy(PrescriberPortalPolicies.Authenticated, policy =>
            policy.RequireAuthenticatedUser()
                .RequireClaim(
                    PrescriberPortalAuthConstants.TokenTypeClaim,
                    PrescriberPortalAuthConstants.TokenTypeValue));
    }
}
