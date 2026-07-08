namespace KitPlatform.Application.Configuration;

public sealed record TenantCustomerAppSettingsDto(
    string AppName,
    string ShortName,
    string LogoUrl,
    string PrimaryColor,
    string SecondaryColor,
    string SupportPhone,
    string Tagline);

public sealed record UpdateTenantCustomerAppSettingsRequest(
    string AppName,
    string ShortName,
    string? LogoUrl,
    string? PrimaryColor,
    string? SecondaryColor,
    string? SupportPhone,
    string? Tagline);
