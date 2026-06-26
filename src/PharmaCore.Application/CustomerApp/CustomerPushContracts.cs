namespace PharmaCore.Application.CustomerApp;

public static class CustomerAppPushSettings
{
    public const string SectionName = "CustomerAppPush";
}

public sealed class CustomerAppPushOptions
{
    public bool Enabled { get; init; } = true;
    public int PollIntervalSeconds { get; init; } = 60;
    public string Subject { get; init; } = "mailto:support@pharmacore.local";
    public string PublicKey { get; init; } = "";
    public string PrivateKey { get; init; } = "";
}

public sealed record RegisterPushSubscriptionRequest(
    string Endpoint,
    string P256dh,
    string Auth);

public sealed record PushSubscriptionStatusDto(
    bool Supported,
    bool Subscribed,
    int SubscriptionCount,
    string? PublicKey);
