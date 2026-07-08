namespace KitPlatform.Application.Notify;

public sealed record NotifyQueueDispatchItem(
    Guid QueueId,
    Guid TenantId,
    string Channel,
    string Title,
    string Body,
    string? PayloadJson,
    Guid? CustomerId,
    int AttemptCount);

public enum NotifyDispatchOutcome
{
    Sent,
    SkippedInApp,
    SkippedNoRecipient,
    SkippedPushDisabled,
    SkippedNoConsent,
    SkippedNoDevice,
    ChannelNotSupported,
    Failed,
}

public sealed record NotifyDispatchResult(NotifyDispatchOutcome Outcome, string? Error = null);

public interface INotifyQueueDispatcher
{
    Task<NotifyDispatchResult> DispatchAsync(
        NotifyQueueDispatchItem item,
        CancellationToken cancellationToken = default);
}
