using Microsoft.AspNetCore.Authorization;

namespace KitPlatform.Api.Authorization;

public static class SuccessPolicies
{
    /// <summary>Owner cockpit / loss prevention — store-wide KPIs, not cashier POS.</summary>
    public const string Owner = "SuccessOwner";

    /// <summary>Shift checklist — cashiers with success.checklist may complete.</summary>
    public const string Checklist = "SuccessChecklist";
}

public static class SuccessAuthorizationExtensions
{
    public static void AddSuccessAuthorization(this AuthorizationOptions options)
    {
        options.AddPolicy(SuccessPolicies.Owner, policy =>
            policy.RequireAssertion(ctx =>
                AdminTokenRules.IsAdminPrincipal(ctx.User)
                && (ctx.User.IsInRole("ADMIN")
                    || ctx.User.IsInRole("MANAGER")
                    || ctx.User.IsInRole("BRANCH_MANAGER")
                    || HasPermission(ctx, "success.read")
                    || HasPermission(ctx, "reports.read")
                    || HasPermission(ctx, "reports.write")
                    || HasPermission(ctx, "reports.export"))));

        options.AddPolicy(SuccessPolicies.Checklist, policy =>
            policy.RequireAssertion(ctx =>
                AdminTokenRules.IsAdminPrincipal(ctx.User)
                && (ctx.User.IsInRole("ADMIN")
                    || HasPermission(ctx, "success.read")
                    || HasPermission(ctx, "success.checklist")
                    || HasPermission(ctx, "sales.pos")
                    || HasPermission(ctx, "sales.write"))));
    }

    private static bool HasPermission(AuthorizationHandlerContext ctx, string permission) =>
        ctx.User.Claims.Any(c => c.Type == "permission" && c.Value == permission);
}
