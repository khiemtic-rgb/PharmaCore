using KitPlatform.Application.Healthcare;
using KitPlatform.Packs.Pharmacy.Rx;
using HealthcareLogin = KitPlatform.Application.Healthcare.PrescriberLoginResponse;
using HealthcareOtpRequest = KitPlatform.Application.Healthcare.PrescriberOtpRequest;
using HealthcareOtpSent = KitPlatform.Application.Healthcare.PrescriberOtpSentResponse;
using HealthcareOtpVerify = KitPlatform.Application.Healthcare.PrescriberOtpVerifyRequest;
using PackOtpRequest = KitPlatform.Packs.Pharmacy.Rx.PrescriberOtpRequest;
using PackOtpVerify = KitPlatform.Packs.Pharmacy.Rx.PrescriberOtpVerifyRequest;
using HealthcareProfile = KitPlatform.Application.Healthcare.PrescriberProfile;

namespace KitPlatform.Packs.Pharmacy.Infrastructure.Healthcare;

/// <summary>Platform <see cref="IPrescriberIdentityService"/> → Pharmacy pack auth (strangler adapter).</summary>
internal sealed class PrescriberIdentityHealthcareAdapter : IPrescriberIdentityService
{
    private readonly IPrescriberPortalAuthService _inner;

    public PrescriberIdentityHealthcareAdapter(IPrescriberPortalAuthService inner) => _inner = inner;

    public async Task<HealthcareOtpSent> RequestOtpAsync(
        HealthcareOtpRequest request,
        CancellationToken cancellationToken = default)
    {
        var result = await _inner.RequestOtpAsync(new PackOtpRequest(request.Phone), cancellationToken);
        return HealthcareDtoMapper.ToOtp(result);
    }

    public async Task<HealthcareLogin?> VerifyOtpAsync(
        HealthcareOtpVerify request,
        CancellationToken cancellationToken = default)
    {
        var result = await _inner.VerifyOtpAsync(
            new PackOtpVerify(request.Phone, request.Code),
            cancellationToken);
        return result is null ? null : HealthcareDtoMapper.ToLogin(result);
    }

    public async Task<HealthcareProfile?> GetProfileAsync(
        Guid prescriberId,
        CancellationToken cancellationToken = default)
    {
        var profile = await _inner.GetProfileAsync(prescriberId, cancellationToken);
        return profile is null ? null : HealthcareDtoMapper.ToProfile(profile);
    }
}
