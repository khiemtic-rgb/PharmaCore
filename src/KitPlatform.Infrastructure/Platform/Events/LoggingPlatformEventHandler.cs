using Microsoft.Extensions.Logging;
using KitPlatform.Application.Platform.Events;

namespace KitPlatform.Infrastructure.Platform.Events;

/// <summary>Default v1 handler — structured log until pack-specific consumers are wired.</summary>
internal sealed class LoggingPlatformEventHandler : IPlatformEventHandler
{
    private static readonly HashSet<string> AllTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        PlatformEventTypes.SalesOrderCompleted,
        PlatformEventTypes.SalesReturnCompleted,
        PlatformEventTypes.CustomerConsentUpdated,
    };

    private readonly ILogger<LoggingPlatformEventHandler> _logger;

    public LoggingPlatformEventHandler(ILogger<LoggingPlatformEventHandler> logger) => _logger = logger;

    public IReadOnlySet<string> EventTypes => AllTypes;

    public Task HandleAsync(PlatformEventEnvelope envelope, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation(
            "Platform event {EventType} tenant={TenantId} aggregate={AggregateType}/{AggregateId}",
            envelope.EventType,
            envelope.TenantId,
            envelope.AggregateType,
            envelope.AggregateId);
        return Task.CompletedTask;
    }
}
