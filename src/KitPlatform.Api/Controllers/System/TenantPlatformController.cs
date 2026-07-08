using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using KitPlatform.Application.Configuration;

namespace KitPlatform.Api.Controllers.TenantSettings;

[ApiController]
[Route("api/system/tenant-platform")]
[Authorize]
public sealed class TenantPlatformController : ControllerBase
{
    private readonly ITenantPlatformSettings _platform;

    public TenantPlatformController(ITenantPlatformSettings platform) => _platform = platform;

    [HttpGet]
    [ProducesResponseType(typeof(TenantPlatformSettingsDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<TenantPlatformSettingsDto>> Get(CancellationToken cancellationToken) =>
        Ok(await _platform.GetAsync(cancellationToken));

    [HttpGet("modules")]
    [ProducesResponseType(typeof(IReadOnlyList<PlatformModuleRegistryItemDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<PlatformModuleRegistryItemDto>>> ListModules(
        CancellationToken cancellationToken) =>
        Ok(await _platform.ListModulesAsync(cancellationToken));

    [HttpPut]
    [Authorize(Roles = "ADMIN")]
    [ProducesResponseType(typeof(TenantPlatformSettingsUpdateResultDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<TenantPlatformSettingsUpdateResultDto>> Update(
        [FromBody] UpdateTenantPlatformSettingsRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            return Ok(await _platform.UpdateAsync(request, cancellationToken));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("labels/{key}")]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    public async Task<ActionResult<object>> GetLabel(
        string key,
        [FromQuery] string? locale,
        CancellationToken cancellationToken)
    {
        var value = await _platform.GetLabelAsync(key, locale, cancellationToken);
        return Ok(new { key, locale, value });
    }
}
