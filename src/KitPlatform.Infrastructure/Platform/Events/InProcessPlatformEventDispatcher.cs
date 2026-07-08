using Microsoft.Extensions.Logging;
using KitPlatform.Application.Platform.Events;

namespace KitPlatform.Infrastructure.Platform.Events;

internal sealed class InProcessPlatformEventDispatcher : IPlatformEventDispatcher
{
    private readonly IEnumerable<IPlatformEventHandler> _handlers;
    private readonly ILogger<InProcessPlatformEventDispatcher> _logger;

    public InProcessPlatformEventDispatcher(
        IEnumerable<IPlatformEventHandler> handlers,
        ILogger<InProcessPlatformEventDispatcher> logger)
    {
        _handlers = handlers;
        _logger = logger;
    }

    public async Task DispatchAsync(PlatformEventEnvelope envelope, CancellationToken cancellationToken = default)
    {
        var matched = _handlers
            .Where(handler => handler.EventTypes.Contains(envelope.EventType, StringComparer.OrdinalIgnoreCase))
            .ToList();

        if (matched.Count == 0)
        {
            _logger.LogDebug(
                "No platform event handler for {EventType} ({AggregateType}/{AggregateId})",
                envelope.EventType,
                envelope.AggregateType,
                envelope.AggregateId);
            return;
        }

        foreach (var handler in matched)
        {
            await handler.HandleAsync(envelope, cancellationToken);
        }
    }
}
