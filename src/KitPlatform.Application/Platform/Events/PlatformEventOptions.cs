namespace KitPlatform.Application.Platform.Events;

public sealed class PlatformEventOptions
{
    public const string SectionName = "PlatformEvents";

    public bool Enabled { get; set; } = true;

    public int PollIntervalSeconds { get; set; } = 5;

    public int BatchSize { get; set; } = 20;

    public int MaxDispatchAttempts { get; set; } = 5;
}
