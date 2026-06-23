namespace PharmaCore.Application.Integration;

public sealed class IntegrationOutboxOptions
{
    public const string SectionName = "IntegrationOutbox";

    public bool Enabled { get; set; } = true;

    public int PollIntervalSeconds { get; set; } = 30;

    public int BatchSize { get; set; } = 20;
}
