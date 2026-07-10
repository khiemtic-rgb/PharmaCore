using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using KitPlatform.Api.Authorization;
using KitPlatform.Application.Configuration;
using KitPlatform.Packs.Pharmacy.Sales;

namespace KitPlatform.Api.Controllers.Pharmacy;

[ApiController]
[Authorize]
[Route("api/pharmacy/rx")]
public sealed class RxSettingsController : ControllerBase
{
    private readonly ITenantSettingsService _settings;
    private readonly ISalesService _sales;

    public RxSettingsController(ITenantSettingsService settings, ISalesService sales)
    {
        _settings = settings;
        _sales = sales;
    }

    [HttpGet("settings")]
    [Authorize(Policy = SalesPolicies.Read)]
    public async Task<ActionResult<TenantRxSettingsDto>> GetSettings(CancellationToken cancellationToken) =>
        Ok(await _settings.GetRxSettingsAsync(cancellationToken));

    [HttpPut("settings")]
    [Authorize(Policy = SalesPolicies.Write)]
    public async Task<ActionResult<TenantRxSettingsDto>> UpdateSettings(
        [FromBody] UpdateTenantRxSettingsRequest request,
        CancellationToken cancellationToken) =>
        Ok(await _settings.UpdateRxSettingsAsync(request, cancellationToken));

    [HttpPost("pos-block")]
    [Authorize(Policy = SalesPolicies.Write)]
    public async Task<IActionResult> ReportPosBlock(
        [FromBody] ReportRxPosBlockRequest request,
        CancellationToken cancellationToken)
    {
        await _sales.ReportRxPosBlockAsync(request, cancellationToken);
        return NoContent();
    }
}
