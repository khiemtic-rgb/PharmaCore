namespace KitPlatform.Application.Configuration;

public interface ITenantPlatformSettings
{
    Task<TenantPlatformSettingsDto> GetAsync(CancellationToken cancellationToken = default);

    Task<IReadOnlyList<PlatformModuleRegistryItemDto>> ListModulesAsync(
        CancellationToken cancellationToken = default);

    Task<TenantPlatformSettingsUpdateResultDto> UpdateAsync(
        UpdateTenantPlatformSettingsRequest request,
        CancellationToken cancellationToken = default);

    Task<bool> IsModuleEnabledAsync(string moduleCode, CancellationToken cancellationToken = default);

    Task<bool> IsModuleEnabledForTenantCodeAsync(
        string tenantCode,
        string moduleCode,
        CancellationToken cancellationToken = default);

    Task<bool> IsFeatureEnabledAsync(string featureCode, CancellationToken cancellationToken = default);

    Task<bool> IsFeatureEnabledForTenantCodeAsync(
        string tenantCode,
        string featureCode,
        CancellationToken cancellationToken = default);

    Task<string?> GetLabelAsync(
        string translationKey,
        string? locale = null,
        CancellationToken cancellationToken = default);

    Task<ResolvedTenantLocaleDto> ResolveLocaleAsync(
        Guid? branchId = null,
        Guid? customerAccountId = null,
        CancellationToken cancellationToken = default);
}
