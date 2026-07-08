namespace KitPlatform.Application.CustomerApp;

public sealed record CustomerAppBrandingDto(
    string TenantCode,
    string TenantName,
    string AppName,
    string ShortName,
    string LogoUrl,
    string PrimaryColor,
    string SecondaryColor,
    string SupportPhone,
    string Tagline,
    string DefaultLocale,
    IReadOnlyList<string> SupportedLocales);

public interface ICustomerAppBrandingService
{
    Task<CustomerAppBrandingDto?> GetByTenantCodeAsync(
        string tenantCode,
        CancellationToken cancellationToken = default);
}
