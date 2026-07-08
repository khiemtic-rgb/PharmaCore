namespace KitPlatform.Application.Platform;

public sealed record PlatformPublicConfigDto(
    string BrandName,
    string ProductName,
    string AdminUrl,
    string CustomerAppUrl,
    string ApiUrl,
    string LoginHint);

public sealed record PlatformSetupStatusDto(
    int TenantsCount,
    bool SetupRequired,
    bool ProvisioningKeyRequired,
    string BrandName,
    string ProductName);

public sealed record PlatformTenantListItemDto(
    Guid Id,
    string TenantCode,
    string TenantName,
    DateTimeOffset CreatedAt,
    short Status);

public sealed record CreatePlatformBranchRequest(
    string BranchCode,
    string BranchName,
    string? BranchAddress,
    string? BranchPhone,
    string WarehouseCode,
    string WarehouseName);

public sealed record CreatePlatformTenantRequest(
    string TenantCode,
    string TenantName,
    string BranchCode,
    string BranchName,
    string? BranchAddress,
    string? BranchPhone,
    string WarehouseCode,
    string WarehouseName,
    string AdminUsername,
    string AdminEmail,
    string AdminFullName,
    string AdminPassword,
    bool LoyaltyEnabled,
    IReadOnlyList<CreatePlatformBranchRequest>? AdditionalBranches = null);

public sealed record CreatePlatformTenantResponse(
    Guid TenantId,
    string TenantCode,
    string TenantName,
    Guid BranchId,
    Guid UserId,
    string AdminUsername,
    int BranchCount);
