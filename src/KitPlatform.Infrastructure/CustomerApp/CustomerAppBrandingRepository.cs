using Dapper;
using KitPlatform.Infrastructure.Data;

namespace KitPlatform.Infrastructure.CustomerApp;

internal sealed class CustomerAppBrandingRepository
{
    private readonly IDbConnectionFactory _db;

    public CustomerAppBrandingRepository(IDbConnectionFactory db) => _db = db;

    public async Task<CustomerAppBrandingRow?> GetByTenantCodeAsync(
        string tenantCode,
        CancellationToken cancellationToken)
    {
        const string sql = """
            SELECT
                tenant_code AS TenantCode,
                tenant_name AS TenantName,
                COALESCE(settings->'customer_app'->'branding'->>'app_name', tenant_name) AS AppName,
                COALESCE(settings->'customer_app'->'branding'->>'short_name', tenant_name) AS ShortName,
                COALESCE(settings->'customer_app'->'branding'->>'logo_url', '/customer-app/icon.svg') AS LogoUrl,
                COALESCE(settings->'customer_app'->'branding'->>'primary_color', '#0F52BA') AS PrimaryColor,
                COALESCE(settings->'customer_app'->'branding'->>'secondary_color', '#3CB371') AS SecondaryColor,
                COALESCE(settings->'customer_app'->'branding'->>'support_phone', '') AS SupportPhone,
                COALESCE(settings->'customer_app'->'branding'->>'tagline', '') AS Tagline,
                COALESCE(
                    settings->'platform'->'i18n'->>'customer_app_default_locale',
                    settings->'platform'->'i18n'->>'default_locale',
                    'vi-VN'
                ) AS DefaultLocale,
                COALESCE(
                    settings->'platform'->'i18n'->'supported_locales',
                    '["vi-VN"]'::jsonb
                )::text AS SupportedLocalesJson
            FROM tenants
            WHERE tenant_code = @TenantCode
              AND deleted_at IS NULL
              AND status = 1
            LIMIT 1
            """;

        await using var conn = await _db.CreateOpenConnectionAsync(cancellationToken);
        return await conn.QuerySingleOrDefaultAsync<CustomerAppBrandingRow>(
            sql,
            new { TenantCode = tenantCode });
    }
}

internal sealed class CustomerAppBrandingRow
{
    public string TenantCode { get; set; } = "";
    public string TenantName { get; set; } = "";
    public string AppName { get; set; } = "";
    public string ShortName { get; set; } = "";
    public string LogoUrl { get; set; } = "";
    public string PrimaryColor { get; set; } = "";
    public string SecondaryColor { get; set; } = "";
    public string SupportPhone { get; set; } = "";
    public string Tagline { get; set; } = "";
    public string DefaultLocale { get; set; } = "vi-VN";
    public string SupportedLocalesJson { get; set; } = "[\"vi-VN\"]";
}
