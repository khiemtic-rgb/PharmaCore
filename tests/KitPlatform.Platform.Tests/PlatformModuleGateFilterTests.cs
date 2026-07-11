using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Abstractions;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.AspNetCore.Routing;
using Moq;
using KitPlatform.Api.Authorization;
using KitPlatform.Application.Configuration;
using KitPlatform.Application.Core;
using Xunit;

namespace KitPlatform.Platform.Tests;

public sealed class PlatformModuleGateFilterTests
{
    [Fact]
    public async Task Module_filter_allows_when_enabled_for_authenticated_tenant()
    {
        var platform = new Mock<ITenantPlatformSettings>();
        platform
            .Setup(p => p.IsModuleEnabledAsync(PlatformModuleCodes.Medication, It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        var filter = new PlatformModuleGateFilter(PlatformModuleCodes.Medication, platform.Object);
        var context = CreateContext(tenantId: Guid.NewGuid());
        var executed = false;

        await filter.OnActionExecutionAsync(
            context,
            () =>
            {
                executed = true;
                return Task.FromResult(new ActionExecutedContext(context, new List<IFilterMetadata>(), null!));
            });

        Assert.Null(context.Result);
        Assert.True(executed);
    }

    [Fact]
    public async Task Module_filter_uses_tenant_code_from_action_arguments_when_anonymous()
    {
        var platform = new Mock<ITenantPlatformSettings>();
        platform
            .Setup(p => p.IsModuleEnabledForTenantCodeAsync(
                "DEMO_PHARMACY",
                PlatformModuleCodes.CustomerApp,
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        var filter = new PlatformModuleGateFilter(PlatformModuleCodes.CustomerApp, platform.Object);
        var context = CreateContext(new Dictionary<string, object?>
        {
            ["request"] = new { Phone = "0909123456", TenantCode = "DEMO_PHARMACY" },
        });
        var executed = false;

        await filter.OnActionExecutionAsync(
            context,
            () =>
            {
                executed = true;
                return Task.FromResult(new ActionExecutedContext(context, new List<IFilterMetadata>(), null!));
            });

        Assert.Null(context.Result);
        Assert.True(executed);
        platform.Verify(
            p => p.IsModuleEnabledAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task Module_filter_blocks_anonymous_when_tenant_code_missing()
    {
        var platform = new Mock<ITenantPlatformSettings>();
        var filter = new PlatformModuleGateFilter(PlatformModuleCodes.CustomerApp, platform.Object);
        var context = CreateContext();

        await filter.OnActionExecutionAsync(
            context,
            () => Task.FromResult(new ActionExecutedContext(context, new List<IFilterMetadata>(), null!)));

        var result = Assert.IsType<ObjectResult>(context.Result);
        Assert.Equal(StatusCodes.Status403Forbidden, result.StatusCode);
    }

    [Fact]
    public async Task Module_filter_blocks_when_disabled_for_authenticated_tenant()
    {
        var platform = new Mock<ITenantPlatformSettings>();
        platform
            .Setup(p => p.IsModuleEnabledAsync(PlatformModuleCodes.Medication, It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);

        var filter = new PlatformModuleGateFilter(PlatformModuleCodes.Medication, platform.Object);
        var context = CreateContext(tenantId: Guid.NewGuid());

        await filter.OnActionExecutionAsync(
            context,
            () => Task.FromResult(new ActionExecutedContext(context, new List<IFilterMetadata>(), null!)));

        var result = Assert.IsType<ObjectResult>(context.Result);
        Assert.Equal(StatusCodes.Status403Forbidden, result.StatusCode);
    }

    [Fact]
    public async Task Feature_filter_blocks_when_disabled_for_authenticated_tenant()
    {
        var platform = new Mock<ITenantPlatformSettings>();
        platform
            .Setup(p => p.IsFeatureEnabledAsync(PlatformFeatureCodes.NationalDrugCatalog, It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);

        var filter = new PlatformFeatureGateFilter(PlatformFeatureCodes.NationalDrugCatalog, platform.Object);
        var context = CreateContext(tenantId: Guid.NewGuid());

        await filter.OnActionExecutionAsync(
            context,
            () => Task.FromResult(new ActionExecutedContext(context, new List<IFilterMetadata>(), null!)));

        var result = Assert.IsType<ObjectResult>(context.Result);
        Assert.Equal(StatusCodes.Status403Forbidden, result.StatusCode);
    }

    [Fact]
    public void Platform_gate_policies_use_stable_prefixes()
    {
        Assert.Equal("PlatformModule:medication", PlatformGatePolicies.Module(PlatformModuleCodes.Medication));
        Assert.Equal("PlatformFeature:national_drug_catalog", PlatformGatePolicies.Feature(PlatformFeatureCodes.NationalDrugCatalog));
    }

    private static ActionExecutingContext CreateContext(
        Dictionary<string, object?>? actionArguments = null,
        Guid? tenantId = null)
    {
        var http = new DefaultHttpContext();
        if (tenantId is Guid tid)
        {
            var identity = new System.Security.Claims.ClaimsIdentity("TestAuth");
            identity.AddClaim(new System.Security.Claims.Claim("tenant_id", tid.ToString()));
            http.User = new System.Security.Claims.ClaimsPrincipal(identity);
        }

        return new ActionExecutingContext(
            new ActionContext(http, new RouteData(), new ActionDescriptor()),
            new List<IFilterMetadata>(),
            actionArguments ?? new Dictionary<string, object?>(),
            null!);
    }
}
