using Microsoft.AspNetCore.Authorization;

namespace KitPlatform.Api.Authorization;

public static class LearningPolicies
{
    public const string Read = "LearningRead";
    public const string Write = "LearningWrite";
}

public static class LearningAuthorizationExtensions
{
    public static void AddLearningAuthorization(this AuthorizationOptions options)
    {
        // NV quầy học bài: learning.* hoặc POS (khớp FE useCanLearningRead).
        options.AddPolicy(LearningPolicies.Read, policy =>
            policy.RequireAssertion(ctx =>
                AdminTokenRules.IsAdminPrincipal(ctx.User)
                && (ctx.User.IsInRole("ADMIN")
                    || HasPermission(ctx, "learning.read")
                    || HasPermission(ctx, "learning.write")
                    || HasPermission(ctx, "sales.pos")
                    || HasPermission(ctx, "sales.write"))));

        options.AddPolicy(LearningPolicies.Write, policy =>
            policy.RequireAssertion(ctx =>
                AdminTokenRules.IsAdminPrincipal(ctx.User)
                && (ctx.User.IsInRole("ADMIN")
                    || HasPermission(ctx, "learning.write"))));
    }

    private static bool HasPermission(AuthorizationHandlerContext ctx, string permission) =>
        ctx.User.Claims.Any(c => c.Type == "permission" && c.Value == permission);
}
