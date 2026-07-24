using Microsoft.AspNetCore.Authorization;

namespace KitPlatform.Api.Authorization;

public static class ReportsPolicies
{
    public const string Read = "ReportsRead";
    public const string Export = "ReportsExport";
}

public static class ReportsAuthorizationExtensions
{
    public static void AddReportsAuthorization(this AuthorizationOptions options)
    {
        // Chỉ reports.* — không kế thừa từ sales/procurement/inventory (STAFF POS không xem BC doanh thu).
        options.AddPolicy(ReportsPolicies.Read, policy =>
            policy.RequireAssertion(ctx =>
                AdminTokenRules.IsAdminPrincipal(ctx.User)
                && (ctx.User.IsInRole("ADMIN")
                || HasPermission(ctx, "reports.read")
                || HasPermission(ctx, "reports.write")
                || HasPermission(ctx, "reports.export"))));

        // Xuất file tách khỏi quyền xem — reports.read chỉ xem/in, không tải CSV.
        options.AddPolicy(ReportsPolicies.Export, policy =>
            policy.RequireAssertion(ctx =>
                AdminTokenRules.IsAdminPrincipal(ctx.User)
                && (ctx.User.IsInRole("ADMIN")
                || HasPermission(ctx, "reports.export"))));
    }

    private static bool HasPermission(AuthorizationHandlerContext ctx, string permission) =>
        ctx.User.Claims.Any(c => c.Type == "permission" && c.Value == permission);
}
