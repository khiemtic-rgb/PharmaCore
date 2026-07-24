using Microsoft.AspNetCore.Authorization;

namespace KitPlatform.Api.Authorization;

public static class DashboardAuthorizationExtensions
{
    public static void AddDashboardAuthorization(this AuthorizationOptions options)
    {
        options.AddPolicy(DashboardPolicies.Read, policy =>
            policy.RequireAssertion(ctx =>
                AdminTokenRules.IsAdminPrincipal(ctx.User)
                && (ctx.User.IsInRole("ADMIN")
                || HasPermission(ctx, "sales.read")
                || HasPermission(ctx, "sales.write")
                || HasPermission(ctx, "sales.pos")
                || HasPermission(ctx, "sales.customers")
                || HasPermission(ctx, "inventory.read")
                || HasPermission(ctx, "inventory.write")
                || HasPermission(ctx, "procurement.read")
                || HasPermission(ctx, "procurement.write")
                || HasPermission(ctx, "catalog.read")
                || HasPermission(ctx, "catalog.write")
                || HasPermission(ctx, "reports.read")
                || HasPermission(ctx, "success.read"))));
    }

    private static bool HasPermission(AuthorizationHandlerContext ctx, string permission) =>
        ctx.User.Claims.Any(c => c.Type == "permission" && c.Value == permission);
}
