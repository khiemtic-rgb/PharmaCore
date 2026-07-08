namespace KitPlatform.Application.CustomerApp;

public sealed class CustomerAppAuthSettings
{
    public const string SectionName = "CustomerAppAuth";

    /// <summary>JWT audience riêng — không dùng chung token admin.</summary>
    public string Audience { get; set; } = "KitPlatform.CustomerApp";

    public int AccessTokenExpireMinutes { get; set; } = 120;

    public int RefreshTokenExpireDays { get; set; } = 60;

    public int OtpExpireMinutes { get; set; } = 5;

    public int OtpCooldownSeconds { get; set; } = 60;

    public int MaxVerifyAttempts { get; set; } = 5;

    /// <summary>Chỉ dùng khi ASPNETCORE_ENVIRONMENT=Development (ví dụ 000000).</summary>
    public string? DevBypassCode { get; set; }

    /// <summary>
    /// Pilot: lưu mã OTP để nhân viên xem trong admin (tắt khi đã có SMS gateway thật).
    /// </summary>
    public bool ExposePilotOtpInAdmin { get; set; }

    /// <summary>
    /// Pilot: trả mã OTP trong response request-otp để hiển thị trên customer-app (tắt khi có SMS thật).
    /// </summary>
    public bool ExposePilotOtpOnCustomerApp { get; set; }
}
