using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using KitPlatform.Application.Configuration;
using KitPlatform.Application.Platform;

namespace KitPlatform.Api.Controllers.Platform;

[ApiController]
[AllowAnonymous]
[Route("api/platform")]
public sealed class PlatformController : ControllerBase
{
    private readonly IPlatformTenantService _platform;

    public PlatformController(IPlatformTenantService platform) => _platform = platform;

    [HttpGet("public-config")]
    [ProducesResponseType(typeof(PlatformPublicConfigDto), StatusCodes.Status200OK)]
    public ActionResult<PlatformPublicConfigDto> GetPublicConfig() => Ok(_platform.GetPublicConfig());

    [HttpGet("setup-status")]
    [ProducesResponseType(typeof(PlatformSetupStatusDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<PlatformSetupStatusDto>> GetSetupStatus(CancellationToken cancellationToken) =>
        Ok(await _platform.GetSetupStatusAsync(cancellationToken));

    [HttpGet("modules")]
    [ProducesResponseType(typeof(IReadOnlyList<PlatformModuleRegistryItemDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<PlatformModuleRegistryItemDto>>> ListModules(
        [FromHeader(Name = "X-Platform-Key")] string? platformKey,
        CancellationToken cancellationToken)
    {
        try
        {
            var status = await _platform.GetSetupStatusAsync(cancellationToken);
            if (status.TenantsCount > 0)
                await _platform.EnsureCanManageTenantsAsync(platformKey, cancellationToken);

            return Ok(await _platform.ListModulesAsync(cancellationToken));
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("tenants")]
    [ProducesResponseType(typeof(IReadOnlyList<PlatformTenantListItemDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<PlatformTenantListItemDto>>> ListTenants(
        [FromHeader(Name = "X-Platform-Key")] string? platformKey,
        CancellationToken cancellationToken)
    {
        try
        {
            var status = await _platform.GetSetupStatusAsync(cancellationToken);
            if (status.TenantsCount > 0)
                await _platform.EnsureCanManageTenantsAsync(platformKey, cancellationToken);

            return Ok(await _platform.ListTenantsAsync(cancellationToken));
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("tenants/{tenantId:guid}/entitlement")]
    [ProducesResponseType(typeof(PlatformTenantEntitlementDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<PlatformTenantEntitlementDto>> GetTenantEntitlement(
        Guid tenantId,
        [FromHeader(Name = "X-Platform-Key")] string? platformKey,
        CancellationToken cancellationToken)
    {
        try
        {
            await _platform.EnsureCanManageTenantsAsync(platformKey, cancellationToken);
            return Ok(await _platform.GetTenantEntitlementAsync(tenantId, cancellationToken));
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("tenants/{tenantId:guid}/entitlement")]
    [ProducesResponseType(typeof(PlatformTenantEntitlementDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<PlatformTenantEntitlementDto>> UpdateTenantEntitlement(
        Guid tenantId,
        [FromBody] UpdatePlatformTenantEntitlementRequest request,
        [FromHeader(Name = "X-Platform-Key")] string? platformKey,
        CancellationToken cancellationToken)
    {
        try
        {
            return Ok(await _platform.UpdateTenantEntitlementAsync(
                tenantId,
                request,
                platformKey,
                cancellationToken));
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("tenants")]
    [ProducesResponseType(typeof(CreatePlatformTenantResponse), StatusCodes.Status201Created)]
    public async Task<ActionResult<CreatePlatformTenantResponse>> CreateTenant(
        [FromBody] CreatePlatformTenantRequest request,
        [FromHeader(Name = "X-Platform-Key")] string? platformKey,
        CancellationToken cancellationToken)
    {
        try
        {
            var created = await _platform.CreateTenantAsync(request, platformKey, cancellationToken);
            return Created($"/api/platform/tenants/{created.TenantId}", created);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
