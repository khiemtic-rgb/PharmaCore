using Microsoft.AspNetCore.Authorization;
using PharmaCore.Application.CustomerApp;

namespace PharmaCore.Api.Authorization;

public static class CustomerAppPolicies
{
    public const string Authenticated = "CustomerApp";
}

public static class CustomerAppAuthorizationExtensions
{
    public static void AddCustomerAppAuthorization(this AuthorizationOptions options)
    {
        options.AddPolicy(CustomerAppPolicies.Authenticated, policy =>
            policy.RequireAuthenticatedUser()
                .RequireClaim(CustomerAppAuthConstants.TokenTypeClaim, CustomerAppAuthConstants.TokenTypeValue));
    }
}
