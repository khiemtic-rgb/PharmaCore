using System.Text.Json;
using Microsoft.Extensions.Logging.Abstractions;
using KitPlatform.Application.Platform.Events;
using KitPlatform.Packs.Pharmacy;
using KitPlatform.Packs.Pharmacy.Infrastructure.Events;
using Xunit;

namespace KitPlatform.Platform.Tests;

public sealed class PharmacySalesReturnCompletedHandlerTests
{
    [Fact]
    public async Task Handler_accepts_pharmacy_pack_source()
    {
        var handler = new PharmacySalesReturnCompletedHandler(NullLogger<PharmacySalesReturnCompletedHandler>.Instance);
        var data = JsonSerializer.SerializeToElement(new
        {
            returnId = Guid.NewGuid(),
            returnNumber = "SR-TEST-001",
            salesOrderId = Guid.NewGuid(),
        });

        await handler.HandleAsync(new PlatformEventEnvelope(
            Guid.NewGuid(),
            PlatformEventTypes.SalesReturnCompleted,
            1,
            Guid.NewGuid(),
            DateTimeOffset.UtcNow,
            PharmacyPackDefinition.EventSource,
            PlatformEventAggregateTypes.SalesReturn,
            Guid.NewGuid(),
            null,
            null,
            data));
    }
}
