using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
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
