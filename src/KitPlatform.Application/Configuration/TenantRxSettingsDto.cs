namespace KitPlatform.Application.Configuration;

public sealed record TenantRxSettingsDto(
    string EnforcementMode,
    bool PosBlockedAudit);

public sealed record UpdateTenantRxSettingsRequest(
    string EnforcementMode,
    bool PosBlockedAudit);
