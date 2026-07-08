using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using KitPlatform.Application.CustomerApp;

namespace KitPlatform.Infrastructure.CustomerApp;

internal sealed class HttpCustomerOtpSender : ICustomerOtpSender
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };

    private readonly HttpClient _http;
    private readonly CustomerAppSmsSettings _settings;
    private readonly ILogger<HttpCustomerOtpSender> _logger;

    public HttpCustomerOtpSender(
        HttpClient http,
        IOptions<CustomerAppSmsSettings> settings,
        ILogger<HttpCustomerOtpSender> logger)
    {
        _http = http;
        _settings = settings.Value;
        _logger = logger;
    }

    public async Task SendOtpAsync(
        string phone,
        string tenantCode,
        string code,
        int expireMinutes,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(_settings.HttpUrl))
            throw new InvalidOperationException("CustomerAppSms:HttpUrl chưa cấu hình.");

        var message = _settings.MessageTemplate
            .Replace("{code}", code, StringComparison.Ordinal)
            .Replace("{minutes}", expireMinutes.ToString(), StringComparison.Ordinal)
            .Replace("{phone}", phone, StringComparison.Ordinal)
            .Replace("{tenant}", tenantCode, StringComparison.Ordinal);

        var json = JsonSerializer.Serialize(new
        {
            phone,
            tenantCode,
            message,
            code,
            expireMinutes,
        }, JsonOptions);

        using var request = new HttpRequestMessage(HttpMethod.Post, _settings.HttpUrl)
        {
            Content = new StringContent(json, Encoding.UTF8, "application/json"),
            Version = new Version(1, 1),
        };
        request.Headers.ExpectContinue = false;

        if (!string.IsNullOrWhiteSpace(_settings.ApiKey))
        {
            request.Headers.TryAddWithoutValidation(
                _settings.ApiKeyHeader,
                _settings.ApiKey);
        }

        var response = await _http.SendAsync(request, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            var body = await response.Content.ReadAsStringAsync(cancellationToken);
            _logger.LogError(
                "SMS gateway HTTP {Status} for {Phone}: {Body}",
                (int)response.StatusCode,
                phone,
                body);
            throw new InvalidOperationException("Không gửi được SMS OTP. Thử lại sau.");
        }

        _logger.LogInformation("OTP SMS sent via gateway to {Phone} (tenant {Tenant})", phone, tenantCode);

        if (IsLocalStubUrl(_settings.HttpUrl))
        {
            _logger.LogInformation(
                "OTP pilot code for {Phone} (tenant {Tenant}): {Code}",
                phone,
                tenantCode,
                code);
        }
    }

    private static bool IsLocalStubUrl(string url)
    {
        if (!Uri.TryCreate(url, UriKind.Absolute, out var uri))
            return false;

        return uri.IsLoopback;
    }
}
