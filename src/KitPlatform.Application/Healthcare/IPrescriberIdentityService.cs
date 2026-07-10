namespace KitPlatform.Application.Healthcare;

/// <summary>
/// Prescriber identity &amp; portal auth — platform contract; Pharmacy pack implements (Rx-2 Phase A).
/// </summary>
public interface IPrescriberIdentityService
{
    Task<PrescriberOtpSentResponse> RequestOtpAsync(
        PrescriberOtpRequest request,
        CancellationToken cancellationToken = default);

    Task<PrescriberLoginResponse?> VerifyOtpAsync(
        PrescriberOtpVerifyRequest request,
        CancellationToken cancellationToken = default);

    Task<PrescriberProfile?> GetProfileAsync(
        Guid prescriberId,
        CancellationToken cancellationToken = default);
}
