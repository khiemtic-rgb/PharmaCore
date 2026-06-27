using System.Security.Claims;
using PharmaCore.Application.CustomerApp;

namespace PharmaCore.Api.Authorization;

/// <summary>JWT admin ERP — không phải customer_app.</summary>
public static class AdminTokenRules
{
    public static bool IsAdminPrincipal(ClaimsPrincipal? user) =>
        user?.Identity?.IsAuthenticated == true
        && user.FindFirst(CustomerAppAuthConstants.TokenTypeClaim)?.Value
            != CustomerAppAuthConstants.TokenTypeValue;
}
