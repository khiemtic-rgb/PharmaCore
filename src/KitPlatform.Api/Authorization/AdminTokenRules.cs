using System.Security.Claims;
using KitPlatform.Application.CustomerApp;
using KitPlatform.Packs.Pharmacy.Rx;
using KitPlatform.Packs.Survey;

namespace KitPlatform.Api.Authorization;

/// <summary>JWT admin ERP — không phải customer_app / prescriber_portal / partner_portal.</summary>
public static class AdminTokenRules
{
    public static bool IsAdminPrincipal(ClaimsPrincipal? user)
    {
        if (user?.Identity?.IsAuthenticated != true)
            return false;

        var tokenType = user.FindFirst(CustomerAppAuthConstants.TokenTypeClaim)?.Value;
        if (string.Equals(tokenType, CustomerAppAuthConstants.TokenTypeValue, StringComparison.Ordinal))
            return false;

        if (string.Equals(tokenType, PrescriberPortalAuthConstants.TokenTypeValue, StringComparison.Ordinal))
            return false;

        if (string.Equals(tokenType, PartnerPortalAuthConstants.TokenTypeValue, StringComparison.Ordinal))
            return false;

        return true;
    }
}
