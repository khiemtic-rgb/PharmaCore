namespace KitPlatform.Application.Configuration;

public sealed record PlatformModuleRegistryItemDto(
    string ModuleCode,
    string ModuleName,
    string? Description,
    IReadOnlyList<string> Verticals,
    int SortOrder);

public sealed record UpdateTenantPlatformSettingsRequest(
    string Vertical,
    IReadOnlyList<string> EnabledModules,
    IReadOnlyDictionary<string, bool>? Features = null);

public sealed record TenantPlatformSettingsUpdateResultDto(
    TenantPlatformSettingsDto Settings,
    IReadOnlyList<string> IgnoredModuleCodes);
