using System.Text.Json;
using KitPlatform.Application.CustomerApp;

namespace KitPlatform.Infrastructure.CustomerApp;

internal sealed class CustomerAppBrandingService : ICustomerAppBrandingService
{
    private readonly CustomerAppBrandingRepository _repo;

    public CustomerAppBrandingService(CustomerAppBrandingRepository repo) => _repo = repo;

    public async Task<CustomerAppBrandingDto?> GetByTenantCodeAsync(
        string tenantCode,
        CancellationToken cancellationToken = default)
    {
        var code = tenantCode?.Trim();
        if (string.IsNullOrWhiteSpace(code))
            return null;

        var row = await _repo.GetByTenantCodeAsync(code, cancellationToken);
        if (row is null)
            return null;

        return new CustomerAppBrandingDto(
            row.TenantCode,
            row.TenantName,
            row.AppName,
            row.ShortName,
            row.LogoUrl,
            row.PrimaryColor,
            row.SecondaryColor,
            row.SupportPhone,
            row.Tagline,
            string.IsNullOrWhiteSpace(row.DefaultLocale) ? "vi-VN" : row.DefaultLocale.Trim(),
            ParseSupportedLocales(row.SupportedLocalesJson));
    }

    private static IReadOnlyList<string> ParseSupportedLocales(string? json)
    {
        if (string.IsNullOrWhiteSpace(json))
            return ["vi-VN"];

        try
        {
            var locales = JsonSerializer.Deserialize<string[]>(json);
            if (locales is null || locales.Length == 0)
                return ["vi-VN"];

            return locales
                .Select(x => x?.Trim())
                .Where(x => !string.IsNullOrWhiteSpace(x))
                .Select(x => x!)
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();
        }
        catch
        {
            return ["vi-VN"];
        }
    }
}
