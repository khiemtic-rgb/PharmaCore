using KitPlatform.Application.Configuration;
using KitPlatform.Application.Core;
using Xunit;

namespace KitPlatform.Platform.Tests;

public sealed class TenantPlatformSettingsValidatorTests
{
    private static readonly HashSet<string> Registry = new(StringComparer.OrdinalIgnoreCase)
    {
        PlatformModuleCodes.Sales,
        PlatformModuleCodes.Medication,
        "unknown_pack",
    };

    [Fact]
    public void NormalizeModules_accepts_registry_codes()
    {
        var (accepted, ignored) = TenantPlatformSettingsValidator.NormalizeModules(
            [PlatformModuleCodes.Sales, PlatformModuleCodes.Medication],
            Registry);

        Assert.Equal(2, accepted.Count);
        Assert.Empty(ignored);
    }

    [Fact]
    public void NormalizeModules_ignores_unknown_codes()
    {
        var (accepted, ignored) = TenantPlatformSettingsValidator.NormalizeModules(
            [PlatformModuleCodes.Sales, "not_a_module"],
            Registry);

        Assert.Single(accepted);
        Assert.Equal("not_a_module", ignored[0]);
    }

    [Fact]
    public void NormalizeVertical_rejects_invalid()
    {
        Assert.Throws<InvalidOperationException>(() =>
            TenantPlatformSettingsValidator.NormalizeVertical("retail_store"));
    }

    [Fact]
    public void MergeFeatures_only_updates_known_keys()
    {
        var current = new Dictionary<string, bool>(StringComparer.OrdinalIgnoreCase)
        {
            [PlatformFeatureCodes.NationalDrugCatalog] = true,
            [PlatformFeatureCodes.BatchTracking] = true,
        };

        var merged = TenantPlatformSettingsValidator.MergeFeatures(
            current,
            new Dictionary<string, bool>
            {
                [PlatformFeatureCodes.NationalDrugCatalog] = false,
                ["custom_unknown"] = true,
            });

        Assert.False(merged[PlatformFeatureCodes.NationalDrugCatalog]);
        Assert.True(merged[PlatformFeatureCodes.BatchTracking]);
        Assert.False(merged.ContainsKey("custom_unknown"));
    }
}
