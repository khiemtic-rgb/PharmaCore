namespace KitPlatform.Application.Configuration;

public sealed record TenantPlatformSettingsDto(
    int SchemaVersion,
    string Vertical,
    IReadOnlyList<string> EnabledModules,
    /// <summary>Core-assigned ceiling — tenant ADMIN may only enable within this set.</summary>
    IReadOnlyList<string> AllowedModules,
    TenantPlatformI18nDto I18n,
    IReadOnlyDictionary<string, bool> Features,
    IReadOnlyDictionary<string, string> Labels,
    /// <summary>Core-assigned max active branches. Null = unlimited.</summary>
    int? MaxBranches = null);

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
