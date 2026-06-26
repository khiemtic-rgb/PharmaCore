namespace PharmaCore.Application.CustomerApp;

public static class ChatEventTypes
{
    public const string Message = "message";
    public const string Read = "read";
}

public sealed record ChatEventPayload(
    Guid TenantId,
    Guid CustomerId,
    string EventType,
    Guid? MessageId,
    short? SenderType);

public interface IChatEventHub
{
    IAsyncEnumerable<ChatEventPayload> WatchCustomerAsync(
        Guid tenantId,
        Guid customerId,
        CancellationToken cancellationToken);

    IAsyncEnumerable<ChatEventPayload> WatchStaffAsync(
        Guid tenantId,
        CancellationToken cancellationToken);

    void NotifyMessageSent(Guid tenantId, Guid customerId, Guid messageId, short senderType);

    void NotifyRead(Guid tenantId, Guid customerId, short readerSide);
}
