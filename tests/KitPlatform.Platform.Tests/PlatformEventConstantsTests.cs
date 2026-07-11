using KitPlatform.Application.Platform.Events;
using Xunit;

namespace KitPlatform.Platform.Tests;

public sealed class PlatformEventConstantsTests
{
    [Fact]
    public void Event_types_use_dotted_v1_suffix()
    {
        Assert.EndsWith(".v1", PlatformEventTypes.SalesOrderCompleted);
        Assert.Contains('.', PlatformEventTypes.SalesOrderCompleted);
        Assert.Equal("sales.order.completed.v1", PlatformEventTypes.SalesOrderCompleted);
    }

    [Fact]
    public void Pharmacy_pack_source_is_stable()
    {
        Assert.Equal("pack:pharmacy", PlatformEventSources.PharmacyPack);
    }
}
