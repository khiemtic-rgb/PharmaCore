namespace KitPlatform.Application.Platform.Events;

public interface IPlatformEventHandler
{
    IReadOnlySet<string> EventTypes { get; }

    Task HandleAsync(PlatformEventEnvelope envelope, CancellationToken cancellationToken = default);
}
