namespace KitPlatform.Application.CustomerApp;

public sealed class CustomerAppSmsSettings
{
    public const string SectionName = "CustomerAppSms";

    /// <summary>Log = chỉ ghi log (dev). Http = POST tới gateway SMS.</summary>
    public string Provider { get; set; } = "Log";

    public string? HttpUrl { get; set; }

    public string ApiKeyHeader { get; set; } = "Authorization";

    public string? ApiKey { get; set; }

    public string MessageTemplate { get; set; } =
        "Ma OTP KitPlatform cua ban la {code}. Hieu luc {minutes} phut.";
}
