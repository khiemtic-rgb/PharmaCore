using System.Runtime.CompilerServices;
using System.Threading.Channels;
using PharmaCore.Application.CustomerApp;

namespace PharmaCore.Infrastructure.CustomerApp;

internal sealed class ChatEventHub : IChatEventHub
{
    private sealed class Subscription
    {
        public required Func<ChatEventPayload, bool> Filter { get; init; }
        public required ChannelWriter<ChatEventPayload> Writer { get; init; }
    }

    private readonly object _gate = new();
    private readonly List<Subscription> _subscriptions = [];

    public async IAsyncEnumerable<ChatEventPayload> WatchCustomerAsync(
        Guid tenantId,
        Guid customerId,
        [EnumeratorCancellation] CancellationToken cancellationToken)
    {
        await foreach (var payload in WatchAsync(
                           evt => evt.TenantId == tenantId && evt.CustomerId == customerId,
                           cancellationToken))
        {
            yield return payload;
        }
    }

    public async IAsyncEnumerable<ChatEventPayload> WatchStaffAsync(
        Guid tenantId,
        [EnumeratorCancellation] CancellationToken cancellationToken)
    {
        await foreach (var payload in WatchAsync(evt => evt.TenantId == tenantId, cancellationToken))
        {
            yield return payload;
        }
    }

    public void NotifyMessageSent(Guid tenantId, Guid customerId, Guid messageId, short senderType) =>
        Publish(new ChatEventPayload(tenantId, customerId, ChatEventTypes.Message, messageId, senderType));

    public void NotifyRead(Guid tenantId, Guid customerId, short readerSide) =>
        Publish(new ChatEventPayload(tenantId, customerId, ChatEventTypes.Read, null, readerSide));

    private async IAsyncEnumerable<ChatEventPayload> WatchAsync(
        Func<ChatEventPayload, bool> filter,
        [EnumeratorCancellation] CancellationToken cancellationToken)
    {
        var channel = Channel.CreateUnbounded<ChatEventPayload>(
            new UnboundedChannelOptions { SingleReader = true, SingleWriter = false });

        var subscription = new Subscription { Filter = filter, Writer = channel.Writer };
        lock (_gate)
        {
            _subscriptions.Add(subscription);
        }

        try
        {
            await foreach (var payload in channel.Reader.ReadAllAsync(cancellationToken))
            {
                yield return payload;
            }
        }
        finally
        {
            lock (_gate)
            {
                _subscriptions.Remove(subscription);
            }

            channel.Writer.TryComplete();
        }
    }

    private void Publish(ChatEventPayload payload)
    {
        lock (_gate)
        {
            foreach (var subscription in _subscriptions)
            {
                if (!subscription.Filter(payload))
                    continue;

                subscription.Writer.TryWrite(payload);
            }
        }
    }
}
