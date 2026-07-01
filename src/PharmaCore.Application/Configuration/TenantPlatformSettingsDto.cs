namespace PharmaCore.Application.Configuration;

public sealed record TenantPlatformSettingsDto(
    int SchemaVersion,
    string Vertical,
    IReadOnlyList<string> EnabledModules,
    TenantPlatformI18nDto I18n,
    IReadOnlyDictionary<string, bool> Features,
    IReadOnlyDictionary<string, string> Labels);

public sealed record TenantPlatformI18nDto(
    string DefaultLocale,
    IReadOnlyList<string> SupportedLocales,
    string FallbackLocale,
    string AdminDefaultLocale,
    string CustomerAppDefaultLocale);

public sealed record ResolvedTenantLocaleDto(
    string EffectiveLocale,
    string TenantDefaultLocale,
    string? BranchLocale,
    string? CustomerPreferredLocale);
