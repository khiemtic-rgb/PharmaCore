namespace PharmaCore.Application.Configuration;

public interface ITenantPlatformSettings
{
    Task<TenantPlatformSettingsDto> GetAsync(CancellationToken cancellationToken = default);

    Task<bool> IsModuleEnabledAsync(string moduleCode, CancellationToken cancellationToken = default);

    Task<string?> GetLabelAsync(
        string translationKey,
        string? locale = null,
        CancellationToken cancellationToken = default);

    Task<ResolvedTenantLocaleDto> ResolveLocaleAsync(
        Guid? branchId = null,
        Guid? customerAccountId = null,
        CancellationToken cancellationToken = default);
}
