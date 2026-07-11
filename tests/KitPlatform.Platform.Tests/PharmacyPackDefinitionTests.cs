using KitPlatform.Packs.Pharmacy;
using Xunit;

namespace KitPlatform.Platform.Tests;

public sealed class PharmacyPackDefinitionTests
{
    [Fact]
    public void Default_modules_include_pharmacy_pack_codes()
    {
        foreach (var code in PharmacyPackDefinition.PackModuleCodes)
            Assert.Contains(code, PharmacyPackDefinition.DefaultEnabledModules);
    }

    [Fact]
    public void Event_source_matches_platform_writer_default()
    {
        Assert.Equal("pack:pharmacy", PharmacyPackDefinition.EventSource);
    }
}
