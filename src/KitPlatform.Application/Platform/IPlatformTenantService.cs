using KitPlatform.Application.Configuration;

namespace KitPlatform.Application.Platform;

public interface IPlatformTenantService
{
    PlatformPublicConfigDto GetPublicConfig();

    Task<PlatformSetupStatusDto> GetSetupStatusAsync(CancellationToken cancellationToken = default);

    Task<IReadOnlyList<PlatformTenantListItemDto>> ListTenantsAsync(CancellationToken cancellationToken = default);

    Task<IReadOnlyList<PlatformModuleRegistryItemDto>> ListModulesAsync(
        CancellationToken cancellationToken = default);

    Task<PlatformTenantEntitlementDto> GetTenantEntitlementAsync(
        Guid tenantId,
        CancellationToken cancellationToken = default);

    Task<PlatformTenantEntitlementDto> UpdateTenantEntitlementAsync(
        Guid tenantId,
        UpdatePlatformTenantEntitlementRequest request,
        string? provisioningKey,
        CancellationToken cancellationToken = default);

    Task<CreatePlatformTenantResponse> CreateTenantAsync(
        CreatePlatformTenantRequest request,
        string? provisioningKey,
        CancellationToken cancellationToken = default);

    Task EnsureCanManageTenantsAsync(string? provisioningKey, CancellationToken cancellationToken = default);
}
