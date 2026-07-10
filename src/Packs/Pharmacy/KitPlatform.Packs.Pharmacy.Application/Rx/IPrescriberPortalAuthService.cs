namespace KitPlatform.Packs.Pharmacy.Rx;

public interface IPrescriberPortalAuthService
{
    Task<PrescriberOtpSentResponse> RequestOtpAsync(
        PrescriberOtpRequest request,
        CancellationToken cancellationToken = default);

    Task<PrescriberLoginResponse?> VerifyOtpAsync(
        PrescriberOtpVerifyRequest request,
        CancellationToken cancellationToken = default);

    Task<PrescriberProfileDto?> GetProfileAsync(
        Guid prescriberId,
        CancellationToken cancellationToken = default);
}
