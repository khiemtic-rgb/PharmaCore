namespace KitPlatform.Application.Platform.Events;

public sealed record PlatformEventEnvelope(
    Guid EventId,
    string EventType,
    int EventVersion,
    Guid TenantId,
    DateTimeOffset OccurredAt,
    string Source,
    string AggregateType,
    Guid AggregateId,
    Guid? ActorUserId,
    Guid? CorrelationId,
    object? Data);
