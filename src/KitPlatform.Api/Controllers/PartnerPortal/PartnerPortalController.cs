using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using KitPlatform.Api.Authorization;
using KitPlatform.Packs.Survey;

namespace KitPlatform.Api.Controllers.PartnerPortal;

[ApiController]
[Authorize(Policy = PartnerPortalPolicies.Authenticated)]
[Route("api/partner-portal")]
public sealed class PartnerPortalController : ControllerBase
{
    private readonly IPartnerPortalService _portal;
    private readonly IPartnerPortalAuthService _auth;

    public PartnerPortalController(IPartnerPortalService portal, IPartnerPortalAuthService auth)
    {
        _portal = portal;
        _auth = auth;
    }

    [HttpGet("dashboard")]
    [ProducesResponseType(typeof(PartnerPortalDashboardDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> Dashboard(CancellationToken cancellationToken)
    {
        try
        {
            return Ok(await _portal.GetDashboardAsync(RequirePartnerId(), cancellationToken));
        }
        catch (AssessmentException ex)
        {
            return StatusCode(ex.StatusCode, new { errorCode = ex.ErrorCode, message = ex.Message });
        }
    }

    [HttpGet("leads")]
    [ProducesResponseType(typeof(IReadOnlyList<PartnerPortalLeadItemDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Leads(CancellationToken cancellationToken)
    {
        try
        {
            return Ok(await _portal.ListLeadsAsync(RequirePartnerId(), cancellationToken));
        }
        catch (AssessmentException ex)
        {
            return StatusCode(ex.StatusCode, new { errorCode = ex.ErrorCode, message = ex.Message });
        }
    }

    [HttpGet("referral")]
    [ProducesResponseType(typeof(PartnerPortalMeDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> Referral(CancellationToken cancellationToken)
    {
        try
        {
            return Ok(await _auth.GetMeAsync(RequirePartnerId(), cancellationToken));
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
