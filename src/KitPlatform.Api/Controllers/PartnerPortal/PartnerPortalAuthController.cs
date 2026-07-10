using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using KitPlatform.Api.Authorization;
using KitPlatform.Packs.Survey;

namespace KitPlatform.Api.Controllers.PartnerPortal;

[ApiController]
[Route("api/partner-portal/auth")]
[EnableRateLimiting("kap-public")]
public sealed class PartnerPortalAuthController : ControllerBase
{
    private readonly IPartnerPortalAuthService _auth;

    public PartnerPortalAuthController(IPartnerPortalAuthService auth) => _auth = auth;

    [HttpPost("login")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(PartnerPortalLoginResult), StatusCodes.Status200OK)]
    public async Task<IActionResult> Login(
        [FromBody] PartnerPortalLoginRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            return Ok(await _auth.LoginAsync(request, cancellationToken));
        }
        catch (AssessmentException ex)
        {
            return StatusCode(ex.StatusCode, new { errorCode = ex.ErrorCode, message = ex.Message });
        }
    }

    [HttpGet("me")]
    [Authorize(Policy = PartnerPortalPolicies.Authenticated)]
    [ProducesResponseType(typeof(PartnerPortalMeDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> Me(CancellationToken cancellationToken)
    {
        try
        {
            var partnerId = RequirePartnerId();
            return Ok(await _auth.GetMeAsync(partnerId, cancellationToken));
        }
        catch (AssessmentException ex)
        {
            return StatusCode(ex.StatusCode, new { errorCode = ex.ErrorCode, message = ex.Message });
        }
    }

    private Guid RequirePartnerId()
    {
        var raw = User.FindFirstValue(PartnerPortalAuthConstants.PartnerIdClaim)
            ?? User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue("sub");
        if (!Guid.TryParse(raw, out var id))
            throw new AssessmentException(AssessmentErrorCodes.ValidationError, "Token không hợp lệ.", 401);
        return id;
    }
}
