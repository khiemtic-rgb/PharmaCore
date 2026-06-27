namespace PharmaCore.Application.Configuration;

public sealed class PlatformSettings
{
    public const string SectionName = "Platform";

    /// <summary>Mã bí mật để tạo nhà thuốc mới qua /setup (header X-Platform-Key).</summary>
    public string ProvisioningKey { get; set; } = "";

    public string BrandName { get; set; } = "Novixa";

    public string ProductName { get; set; } = "ERP Nhà thuốc";

    public string AdminUrl { get; set; } = "https://admin.novixa.vn";

    public string CustomerAppUrl { get; set; } = "https://novixa.vn";

    public string ApiUrl { get; set; } = "https://api.novixa.vn";
}
