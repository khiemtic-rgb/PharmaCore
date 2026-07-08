using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using KitPlatform.Api.Authorization;
using KitPlatform.Application.Loyalty;

namespace KitPlatform.Api.Controllers.Loyalty;

[ApiController]
[Authorize]
[Route("api/loyalty/settings")]
public sealed class LoyaltySettingsController : ControllerBase
{
    private readonly ILoyaltyAdminService _loyalty;

    public LoyaltySettingsController(ILoyaltyAdminService loyalty) => _loyalty = loyalty;

    [HttpGet]
    [Authorize(Policy = SalesPolicies.Read)]
    [ProducesResponseType(typeof(LoyaltyAdminSettingsDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> Get(CancellationToken cancellationToken) =>
        Ok(await _loyalty.GetSettingsAsync(cancellationToken));

    [HttpPut]
    [Authorize(Policy = SalesPolicies.Write)]
    [ProducesResponseType(typeof(LoyaltyAdminSettingsDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> Save(
        [FromBody] UpdateLoyaltyAdminSettingsRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            return Ok(await _loyalty.SaveSettingsAsync(request, cancellationToken));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
