namespace KitPlatform.Application.Configuration;

public sealed record TenantBatchModeSettingsDto(string BatchMode);

public sealed record UpdateTenantBatchModeRequest(string BatchMode);
