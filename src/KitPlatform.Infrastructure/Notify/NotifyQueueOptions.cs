namespace KitPlatform.Infrastructure.Notify;

internal sealed class NotifyQueueOptions
{
    public const string SectionName = "NotifyQueue";

    public bool Enabled { get; set; } = true;
    public int PollIntervalSeconds { get; set; } = 10;
    public int BatchSize { get; set; } = 20;
    public int MaxAttempts { get; set; } = 5;
}
