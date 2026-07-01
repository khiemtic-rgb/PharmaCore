using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PharmaCore.Application.Configuration;

namespace PharmaCore.Api.Controllers.TenantSettings;

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
