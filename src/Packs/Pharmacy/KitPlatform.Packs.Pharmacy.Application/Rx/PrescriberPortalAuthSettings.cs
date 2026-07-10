namespace KitPlatform.Packs.Pharmacy.Rx;

public sealed class PrescriberPortalAuthSettings
{
    public const string SectionName = "PrescriberPortalAuth";

    public string Audience { get; set; } = "KitPlatform.PrescriberPortal";

    public int AccessTokenExpireMinutes { get; set; } = 480;

    public int OtpExpireMinutes { get; set; } = 5;

    public int OtpCooldownSeconds { get; set; } = 60;

    public int MaxVerifyAttempts { get; set; } = 5;

    public string? DevBypassCode { get; set; }

    /// <summary>Pilot: trả mã OTP trong response (tắt khi có SMS).</summary>
    public bool ExposePilotOtpInResponse { get; set; } = true;
}
