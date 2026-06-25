namespace PharmaCore.Application.CustomerApp;

public interface ICustomerAppAuthService
{
    Task<CustomerOtpSentResponse> RequestOtpAsync(
        RequestCustomerOtpRequest request,
        CancellationToken cancellationToken = default);

    Task<CustomerLoginResponse?> VerifyOtpAsync(
        VerifyCustomerOtpRequest request,
        string? clientIp,
        CancellationToken cancellationToken = default);

    Task<CustomerLoginResponse?> RefreshAsync(
        CustomerRefreshTokenRequest request,
        CancellationToken cancellationToken = default);

    Task<CustomerProfileDto?> GetProfileAsync(
        Guid accountId,
        CancellationToken cancellationToken = default);

    Task LogoutAsync(string refreshToken, CancellationToken cancellationToken = default);
}
