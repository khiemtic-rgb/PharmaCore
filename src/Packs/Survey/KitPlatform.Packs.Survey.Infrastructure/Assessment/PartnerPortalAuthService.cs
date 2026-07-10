using Microsoft.Extensions.Options;
using KitPlatform.Packs.Survey;

namespace KitPlatform.Packs.Survey.Infrastructure;

internal sealed class PartnerPortalAuthService : IPartnerPortalAuthService
{
    private readonly AssessmentPartnerRepository _repo;
    private readonly PartnerPortalJwtTokenService _jwt;
    private readonly AssessmentSettings _settings;

    public PartnerPortalAuthService(
        AssessmentPartnerRepository repo,
        PartnerPortalJwtTokenService jwt,
        IOptions<AssessmentSettings> settings)
    {
        _repo = repo;
        _jwt = jwt;
        _settings = settings.Value;
    }

    public async Task<PartnerPortalLoginResult> LoginAsync(
        PartnerPortalLoginRequest request,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Login) || string.IsNullOrWhiteSpace(request.Password))
            throw new AssessmentException(AssessmentErrorCodes.ValidationError, "Thiếu thông tin đăng nhập.", 400);

        var login = request.Login.Trim();
        var password = request.Password.Trim();

        var partner = await _repo.GetByLoginAsync(login, cancellationToken)
            ?? throw new AssessmentException(AssessmentErrorCodes.ValidationError, "Sai tài khoản hoặc mật khẩu.", 401);

        if (!string.Equals(partner.Status, "active", StringComparison.OrdinalIgnoreCase))
            throw new AssessmentException(AssessmentErrorCodes.ValidationError, "Tài khoản đã bị khóa.", 403);

        if (!BCrypt.Net.BCrypt.Verify(password, partner.PasswordHash))
            throw new AssessmentException(AssessmentErrorCodes.ValidationError, "Sai tài khoản hoặc mật khẩu.", 401);

        await _repo.TouchLoginAsync(partner.Id, cancellationToken);
        var (token, expires) = _jwt.CreateAccessToken(partner);
        return new PartnerPortalLoginResult(token, expires, ToMe(partner));
    }

    public async Task<PartnerPortalMeDto> GetMeAsync(Guid partnerId, CancellationToken cancellationToken = default)
    {
        var partner = await _repo.GetByIdAsync(partnerId, cancellationToken)
            ?? throw new AssessmentException(AssessmentErrorCodes.NotFound, "Không tìm thấy đối tác.", 404);

        if (!string.Equals(partner.Status, "active", StringComparison.OrdinalIgnoreCase))
            throw new AssessmentException(AssessmentErrorCodes.ValidationError, "Tài khoản đã bị khóa.", 403);

        return ToMe(partner);
    }

    private PartnerPortalMeDto ToMe(AssessmentPartnerRepository.PartnerRow partner)
    {
        var referralUrl = BuildReferralUrl(partner.Code);
        var qrUrl = $"https://api.qrserver.com/v1/create-qr-code/?size=240x240&data={Uri.EscapeDataString(referralUrl)}";
        return new PartnerPortalMeDto(
            partner.Id,
            partner.Code,
            partner.Name,
            partner.PartnerType,
            partner.Phone,
            partner.Email,
            referralUrl,
            qrUrl);
    }

    private string BuildReferralUrl(string code)
    {
        var baseUrl = (_settings.KapPublicUrl ?? "https://survey.novixa.vn").TrimEnd('/');
        return $"{baseUrl}/?ref={Uri.EscapeDataString(code)}";
    }
}
