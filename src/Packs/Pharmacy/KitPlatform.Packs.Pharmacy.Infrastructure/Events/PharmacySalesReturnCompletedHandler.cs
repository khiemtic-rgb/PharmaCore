using System.Text.Json;
using Microsoft.Extensions.Logging;
using KitPlatform.Application.Platform.Events;
using KitPlatform.Packs.Pharmacy;

namespace KitPlatform.Packs.Pharmacy.Infrastructure.Events;

internal sealed class PharmacySalesReturnCompletedHandler : IPlatformEventHandler
{
    private readonly ILogger<PharmacySalesReturnCompletedHandler> _logger;

    public PharmacySalesReturnCompletedHandler(ILogger<PharmacySalesReturnCompletedHandler> logger) =>
        _logger = logger;

    public IReadOnlySet<string> EventTypes { get; } =
        new HashSet<string>(StringComparer.OrdinalIgnoreCase) { PlatformEventTypes.SalesReturnCompleted };

    public Task HandleAsync(PlatformEventEnvelope envelope, CancellationToken cancellationToken = default)
    {
        if (!string.Equals(envelope.Source, PharmacyPackDefinition.EventSource, StringComparison.OrdinalIgnoreCase)
            && !string.Equals(envelope.Source, PlatformEventSources.PharmacyPack, StringComparison.OrdinalIgnoreCase))
        {
            return Task.CompletedTask;
        }

        var returnNumber = TryReadString(envelope.Data, "returnNumber");
        var salesOrderId = TryReadGuid(envelope.Data, "salesOrderId");

        _logger.LogInformation(
            "Pharmacy pack handled {EventType} return={ReturnNumber} orderId={SalesOrderId} tenant={TenantId}",
            envelope.EventType,
            returnNumber ?? "(unknown)",
            salesOrderId,
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
