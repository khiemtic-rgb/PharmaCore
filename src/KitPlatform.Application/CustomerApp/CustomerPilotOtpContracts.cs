namespace KitPlatform.Application.CustomerApp;

public sealed record CustomerPilotOtpStatusDto(
    bool Enabled,
    string? Code,
    DateTimeOffset? ExpiresAt,
    DateTimeOffset? CreatedAt);
