namespace PharmaCore.Application.CustomerApp;

public sealed record RequestCustomerOtpRequest(string Phone, string? TenantCode = null);

public sealed record VerifyCustomerOtpRequest(string Phone, string Code, string? TenantCode = null);

public sealed record CustomerOtpSentResponse(
    int ExpiresInSeconds,
    int CooldownSeconds,
    string Message);

public sealed record CustomerProfileDto(
    Guid AccountId,
    Guid CustomerId,
    Guid TenantId,
    string TenantCode,
    string FullName,
    string Phone,
    string? PreferredLocale);

public sealed record UpdateCustomerPreferredLocaleRequest(string PreferredLocale);

public sealed record CustomerLoginResponse(
    string AccessToken,
    string RefreshToken,
    DateTimeOffset AccessTokenExpiresAt,
    CustomerProfileDto Profile);

public sealed record CustomerRefreshTokenRequest(string RefreshToken);
