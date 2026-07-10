using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using KitPlatform.Application.CustomerApp;
using KitPlatform.Infrastructure.CustomerApp;
using KitPlatform.Packs.Pharmacy.Rx;

namespace KitPlatform.Packs.Pharmacy.Infrastructure;

internal sealed class PrescriberPortalAuthService : IPrescriberPortalAuthService
{
    private readonly PrescriberPortalRepository _repo;
    private readonly PrescriberPortalJwtTokenService _tokens;
    private readonly PrescriberPortalAuthSettings _settings;
    private readonly ICustomerOtpSender _otpSender;
    private readonly IHostEnvironment _env;
    private readonly ILogger<PrescriberPortalAuthService> _logger;

    public PrescriberPortalAuthService(
        PrescriberPortalRepository repo,
        PrescriberPortalJwtTokenService tokens,
        IOptions<PrescriberPortalAuthSettings> settings,
        ICustomerOtpSender otpSender,
        IHostEnvironment env,
        ILogger<PrescriberPortalAuthService> logger)
    {
        _repo = repo;
        _tokens = tokens;
        _settings = settings.Value;
        _otpSender = otpSender;
        _env = env;
        _logger = logger;
    }

    public async Task<PrescriberOtpSentResponse> RequestOtpAsync(
        PrescriberOtpRequest request,
        CancellationToken cancellationToken = default)
    {
        var phone = PrescriberPortalRepository.NormalizePhone(request.Phone);
        if (phone.Length < 9)
            throw new InvalidOperationException("Số điện thoại không hợp lệ.");

        var prescriber = await _repo.FindPrescriberByPhoneAsync(phone, cancellationToken)
            ?? throw new InvalidOperationException(
                "Chưa có hồ sơ bác sĩ trên Novixa. Vui lòng nhờ nhà thuốc gửi lời mời liên kết.");

        if (prescriber.Status == "suspended")
            throw new InvalidOperationException("Tài khoản bác sĩ đã bị tạm khóa.");

        var lastCreated = await _repo.GetLatestOtpCreatedAtAsync(phone, cancellationToken);
        if (lastCreated.HasValue)
        {
            var elapsed = DateTime.UtcNow - lastCreated.Value.ToUniversalTime();
            if (elapsed.TotalSeconds < _settings.OtpCooldownSeconds)
            {
                var wait = _settings.OtpCooldownSeconds - (int)elapsed.TotalSeconds;
                throw new InvalidOperationException($"Vui lòng đợi {wait}s trước khi gửi lại mã OTP.");
            }
        }

        var code = CustomerAppAuthRepository.GenerateOtpCode();
        if (_env.IsDevelopment() && !string.IsNullOrWhiteSpace(_settings.DevBypassCode))
            code = _settings.DevBypassCode.Trim();

        var expiresAt = DateTime.UtcNow.AddMinutes(_settings.OtpExpireMinutes);
        var pilotCode = _settings.ExposePilotOtpInResponse ? code : null;

        await _repo.InsertOtpChallengeAsync(
            phone,
            CustomerAppAuthRepository.HashOtp(code),
            expiresAt,
            pilotCode,
            cancellationToken);

        try
        {
            await _otpSender.SendOtpAsync(
                phone,
                "PRESCRIBER",
                code,
                _settings.OtpExpireMinutes,
                cancellationToken);
        }
        catch (Exception ex) when (_settings.ExposePilotOtpInResponse)
        {
            // Pilot: vẫn trả OTP trên UI nếu SMS gateway lỗi/timeout.
            _logger.LogWarning(ex, "Prescriber OTP SMS failed for {Phone}; continuing with pilot code", phone);
        }

        _logger.LogInformation("Prescriber OTP requested for {Phone} ({PrescriberId})", phone, prescriber.Id);

        var message = _settings.ExposePilotOtpInResponse
            ? "Mã đăng nhập hiển thị bên dưới (pilot)."
            : _env.IsDevelopment()
                ? "Đã gửi mã OTP (dev: xem log API)."
                : "Đã gửi mã OTP qua SMS.";

        return new PrescriberOtpSentResponse(
            _settings.OtpExpireMinutes * 60,
            _settings.OtpCooldownSeconds,
            message,
            pilotCode);
    }

    public async Task<PrescriberLoginResponse?> VerifyOtpAsync(
        PrescriberOtpVerifyRequest request,
        CancellationToken cancellationToken = default)
    {
        var phone = PrescriberPortalRepository.NormalizePhone(request.Phone);
        var code = request.Code.Trim();

        var prescriber = await _repo.FindPrescriberByPhoneAsync(phone, cancellationToken);
        if (prescriber is null || prescriber.Status == "suspended")
            return null;

        var challenge = await _repo.GetActiveOtpChallengeAsync(phone, cancellationToken);
        if (challenge is null)
            return null;

        if (challenge.AttemptCount >= _settings.MaxVerifyAttempts)
            return null;

        var bypass = _env.IsDevelopment()
            && !string.IsNullOrWhiteSpace(_settings.DevBypassCode)
            && code == _settings.DevBypassCode.Trim();

        var hash = CustomerAppAuthRepository.HashOtp(code);
        if (!bypass && !string.Equals(challenge.CodeHash, hash, StringComparison.OrdinalIgnoreCase))
        {
            await _repo.IncrementOtpAttemptAsync(challenge.Id, cancellationToken);
            return null;
        }

        await _repo.ConsumeOtpChallengeAsync(challenge.Id, cancellationToken);

        var (token, expiresAt) = _tokens.CreateAccessToken(prescriber);
        return new PrescriberLoginResponse(token, expiresAt, prescriber.ToDto());
    }

    public async Task<PrescriberProfileDto?> GetProfileAsync(
        Guid prescriberId,
        CancellationToken cancellationToken = default)
    {
        var row = await _repo.FindPrescriberByIdAsync(prescriberId, cancellationToken);
        return row?.ToDto();
    }
}
