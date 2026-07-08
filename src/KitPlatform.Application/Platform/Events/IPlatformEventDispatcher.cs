namespace KitPlatform.Application.Platform.Events;

public interface IPlatformEventDispatcher
{
    Task DispatchAsync(PlatformEventEnvelope envelope, CancellationToken cancellationToken = default);
}
