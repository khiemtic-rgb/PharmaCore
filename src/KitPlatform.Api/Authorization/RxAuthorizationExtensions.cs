using Microsoft.AspNetCore.Authorization;

namespace KitPlatform.Api.Authorization;

public static class RxAuthorizationExtensions
{
    public static void AddRxAuthorization(this AuthorizationOptions options)
    {
        options.AddPolicy(RxPolicies.Read, policy =>
            policy.RequireAssertion(ctx =>
                AdminTokenRules.IsAdminPrincipal(ctx.User)
                && (HasPermission(ctx, "rx.prescription.read")
                    || HasPermission(ctx, "rx.prescription.create")
                    || HasPermission(ctx, "rx.prescription.verify")
                    || HasPermission(ctx, "rx.prescription.dispense")
                    || ctx.User.IsInRole("ADMIN"))));

        options.AddPolicy(RxPolicies.Write, policy =>
            policy.RequireAssertion(ctx =>
                AdminTokenRules.IsAdminPrincipal(ctx.User)
                && (HasPermission(ctx, "rx.prescription.create")
                    || HasPermission(ctx, "rx.prescriber.manage")
                    || HasPermission(ctx, "rx.prescription.dispense")
                    || ctx.User.IsInRole("ADMIN"))));

        options.AddPolicy(RxPolicies.Verify, policy =>
            policy.RequireAssertion(ctx =>
                AdminTokenRules.IsAdminPrincipal(ctx.User)
                && (HasPermission(ctx, "rx.prescription.verify")
                    || ctx.User.IsInRole("ADMIN"))));

        options.AddPolicy(RxPolicies.LinkManage, policy =>
            policy.RequireAssertion(ctx =>
                AdminTokenRules.IsAdminPrincipal(ctx.User)
                && (HasPermission(ctx, "rx.prescriber.link.manage")
                    || HasPermission(ctx, "rx.prescriber.manage")
                    || ctx.User.IsInRole("ADMIN"))));
    }

    private static bool HasPermission(AuthorizationHandlerContext ctx, string permission) =>
        ctx.User.Claims.Any(c => c.Type == "permission" && c.Value == permission);
}
