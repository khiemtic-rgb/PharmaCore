namespace PharmaCore.Application.Platform;

public interface IPlatformTenantService
{
    PlatformPublicConfigDto GetPublicConfig();

    Task<PlatformSetupStatusDto> GetSetupStatusAsync(CancellationToken cancellationToken = default);

    Task<IReadOnlyList<PlatformTenantListItemDto>> ListTenantsAsync(CancellationToken cancellationToken = default);

    Task<CreatePlatformTenantResponse> CreateTenantAsync(
        CreatePlatformTenantRequest request,
        string? provisioningKey,
        CancellationToken cancellationToken = default);

    Task EnsureCanManageTenantsAsync(string? provisioningKey, CancellationToken cancellationToken = default);
}
