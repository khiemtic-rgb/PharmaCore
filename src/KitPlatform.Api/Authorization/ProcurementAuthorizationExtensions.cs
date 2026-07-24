using Microsoft.AspNetCore.Authorization;

namespace KitPlatform.Api.Authorization;

public static class ProcurementAuthorizationExtensions
{
    public static void AddProcurementAuthorization(this AuthorizationOptions options)
    {
        options.AddPolicy(ProcurementPolicies.Read, policy =>
            policy.RequireAssertion(ctx =>
                AdminTokenRules.IsAdminPrincipal(ctx.User)
                && (HasAny(
                        ctx,
                        "procurement.read",
                        "procurement.write",
                        "procurement.suppliers",
                        "procurement.po",
                        "procurement.approve",
                        "procurement.receive",
                        "procurement.pay")
                    || ctx.User.IsInRole("ADMIN"))));

        options.AddPolicy(ProcurementPolicies.Write, policy =>
            policy.RequireAssertion(ctx =>
                AdminTokenRules.IsAdminPrincipal(ctx.User)
                && (HasPermission(ctx, "procurement.write") || ctx.User.IsInRole("ADMIN"))));

        options.AddPolicy(ProcurementPolicies.Suppliers, policy =>
            policy.RequireAssertion(ctx =>
                AdminTokenRules.IsAdminPrincipal(ctx.User)
                && (HasAny(ctx, "procurement.suppliers", "procurement.write") || ctx.User.IsInRole("ADMIN"))));

        options.AddPolicy(ProcurementPolicies.PurchaseOrders, policy =>
            policy.RequireAssertion(ctx =>
                AdminTokenRules.IsAdminPrincipal(ctx.User)
                && (HasAny(ctx, "procurement.po", "procurement.write") || ctx.User.IsInRole("ADMIN"))));

        options.AddPolicy(ProcurementPolicies.Approve, policy =>
            policy.RequireAssertion(ctx =>
                AdminTokenRules.IsAdminPrincipal(ctx.User)
                && (HasAny(ctx, "procurement.approve", "procurement.write") || ctx.User.IsInRole("ADMIN"))));

        options.AddPolicy(ProcurementPolicies.Receive, policy =>
            policy.RequireAssertion(ctx =>
                AdminTokenRules.IsAdminPrincipal(ctx.User)
                && (HasAny(ctx, "procurement.receive", "procurement.write") || ctx.User.IsInRole("ADMIN"))));

        options.AddPolicy(ProcurementPolicies.Pay, policy =>
            policy.RequireAssertion(ctx =>
                AdminTokenRules.IsAdminPrincipal(ctx.User)
                && (HasAny(ctx, "procurement.pay", "procurement.write") || ctx.User.IsInRole("ADMIN"))));
    }

    private static bool HasPermission(AuthorizationHandlerContext ctx, string permission) =>
        ctx.User.Claims.Any(c => c.Type == "permission" && c.Value == permission);

    private static bool HasAny(AuthorizationHandlerContext ctx, params string[] permissions) =>
        permissions.Any(p => HasPermission(ctx, p));
}
