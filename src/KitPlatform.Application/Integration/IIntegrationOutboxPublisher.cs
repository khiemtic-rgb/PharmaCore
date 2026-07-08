namespace KitPlatform.Application.Integration;

public interface IIntegrationOutboxPublisher
{
    Task PublishAsync(string payloadJson, CancellationToken cancellationToken = default);
}
