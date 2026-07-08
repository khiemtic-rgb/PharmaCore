using System.Text.Json;
using Microsoft.Extensions.Logging;
using KitPlatform.Application.Customers;
using KitPlatform.Application.CustomerApp;
using KitPlatform.Application.Notify;
using KitPlatform.Infrastructure.CustomerApp;

namespace KitPlatform.Infrastructure.Notify;

internal sealed class NotifyQueueDispatcher : INotifyQueueDispatcher
{
    private readonly ICustomerPushService _push;
    private readonly CustomerAppConsentRepository _consents;
    private readonly ILogger<NotifyQueueDispatcher> _logger;

    public NotifyQueueDispatcher(
        ICustomerPushService push,
        CustomerAppConsentRepository consents,
        ILogger<NotifyQueueDispatcher> logger)
    {
        _push = push;
        _consents = consents;
        _logger = logger;
    }

    public async Task<NotifyDispatchResult> DispatchAsync(
        NotifyQueueDispatchItem item,
        CancellationToken cancellationToken = default)
    {
        var channel = item.Channel.Trim().ToLowerInvariant();

        return channel switch
        {
            "in_app" => new NotifyDispatchResult(NotifyDispatchOutcome.SkippedInApp),
            "push" => await DispatchPushAsync(item, cancellationToken),
            "sms" or "email" => new NotifyDispatchResult(
                NotifyDispatchOutcome.ChannelNotSupported,
                $"Channel '{channel}' is not implemented in notify queue worker."),
            _ => new NotifyDispatchResult(
                NotifyDispatchOutcome.ChannelNotSupported,
                $"Unknown channel '{item.Channel}'."),
        };
    }

    private async Task<NotifyDispatchResult> DispatchPushAsync(
        NotifyQueueDispatchItem item,
        CancellationToken cancellationToken)
    {
        if (item.CustomerId is not Guid customerId)
            return new NotifyDispatchResult(NotifyDispatchOutcome.SkippedNoRecipient);

        if (string.IsNullOrWhiteSpace(_push.GetPublicKey()))
            return new NotifyDispatchResult(NotifyDispatchOutcome.SkippedPushDisabled);

        if (!await _consents.HasGrantedConsentAsync(
                item.TenantId,
                customerId,
                CustomerConsentChannels.AppPush,
                CustomerConsentPurposes.CareReminder,
                cancellationToken))
        {
            return new NotifyDispatchResult(NotifyDispatchOutcome.SkippedNoConsent);
        }

        var (category, href) = ParsePayload(item.PayloadJson);
        try
        {
            var delivered = await _push.TryDispatchPushToCustomerAsync(
                item.TenantId,
                customerId,
                item.Title,
                item.Body,
                category,
                href,
                cancellationToken);

            return delivered
                ? new NotifyDispatchResult(NotifyDispatchOutcome.Sent)
                : new NotifyDispatchResult(NotifyDispatchOutcome.SkippedNoDevice);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Push dispatch failed for notify queue {QueueId}", item.QueueId);
            return new NotifyDispatchResult(NotifyDispatchOutcome.Failed, ex.Message);
        }
    }

    private static (string Category, string Href) ParsePayload(string? payloadJson)
    {
        if (string.IsNullOrWhiteSpace(payloadJson))
            return ("system", "/");

        try
        {
            using var doc = JsonDocument.Parse(payloadJson);
            var root = doc.RootElement;
            var category = root.TryGetProperty("category", out var catEl)
                ? catEl.GetString() ?? "system"
                : "system";
            var href = root.TryGetProperty("href", out var hrefEl)
                ? hrefEl.GetString() ?? "/"
                : "/";
            return (category, href);
        }
        catch (JsonException)
        {
            return ("system", "/");
        }
    }
}
