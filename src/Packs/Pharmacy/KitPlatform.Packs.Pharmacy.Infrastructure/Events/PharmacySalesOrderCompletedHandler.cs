using System.Text.Json;
using Microsoft.Extensions.Logging;
using KitPlatform.Application.Platform.Events;
using KitPlatform.Packs.Pharmacy;

namespace KitPlatform.Packs.Pharmacy.Infrastructure.Events;

/// <summary>Pack consumer for <see cref="PlatformEventTypes.SalesOrderCompleted"/> — repurchase/analytics hooks later.</summary>
internal sealed class PharmacySalesOrderCompletedHandler : IPlatformEventHandler
{
    private readonly ILogger<PharmacySalesOrderCompletedHandler> _logger;

    public PharmacySalesOrderCompletedHandler(ILogger<PharmacySalesOrderCompletedHandler> logger) =>
        _logger = logger;

    public IReadOnlySet<string> EventTypes { get; } =
        new HashSet<string>(StringComparer.OrdinalIgnoreCase) { PlatformEventTypes.SalesOrderCompleted };

    public Task HandleAsync(PlatformEventEnvelope envelope, CancellationToken cancellationToken = default)
    {
        if (!string.Equals(envelope.Source, PharmacyPackDefinition.EventSource, StringComparison.OrdinalIgnoreCase)
            && !string.Equals(envelope.Source, PlatformEventSources.PharmacyPack, StringComparison.OrdinalIgnoreCase))
        {
            return Task.CompletedTask;
        }

        var orderNumber = TryReadString(envelope.Data, "orderNumber");
        var orderId = TryReadGuid(envelope.Data, "orderId");

        _logger.LogInformation(
            "Pharmacy pack handled {EventType} order={OrderNumber} orderId={OrderId} tenant={TenantId}",
            envelope.EventType,
            orderNumber ?? "(unknown)",
            orderId,
            envelope.TenantId);

        return Task.CompletedTask;
    }

    private static string? TryReadString(object? data, string propertyName)
    {
        if (data is not JsonElement element || element.ValueKind != JsonValueKind.Object)
            return null;
        if (!element.TryGetProperty(propertyName, out var prop))
            return null;
        return prop.ValueKind == JsonValueKind.String ? prop.GetString() : prop.ToString();
    }

    private static Guid? TryReadGuid(object? data, string propertyName)
    {
        if (data is not JsonElement element || element.ValueKind != JsonValueKind.Object)
            return null;
        if (!element.TryGetProperty(propertyName, out var prop))
            return null;
        return prop.ValueKind == JsonValueKind.String && Guid.TryParse(prop.GetString(), out var id) ? id : null;
    }
}
