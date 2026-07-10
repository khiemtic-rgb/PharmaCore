using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using KitPlatform.Packs.Survey;

namespace KitPlatform.Api.Controllers.Survey;

[ApiController]
[Authorize(Roles = "ADMIN")]
[Route("api/system/kap/partners")]
public sealed class SurveyKapPartnersController : ControllerBase
{
    private readonly IAssessmentPartnerAdminService _partners;
    private readonly IAssessmentAdminService _access;

    public SurveyKapPartnersController(
        IAssessmentPartnerAdminService partners,
        IAssessmentAdminService access)
    {
        _partners = partners;
        _access = access;
    }

    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<KapPartnerListItemDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> List(CancellationToken cancellationToken)
    {
        if (!_access.GetAccess().Enabled)
            return NotFound();
        return Ok(await _partners.ListAsync(cancellationToken));
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(KapPartnerDetailDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> Get(Guid id, CancellationToken cancellationToken)
    {
        if (!_access.GetAccess().Enabled)
            return NotFound();
        var detail = await _partners.GetAsync(id, cancellationToken);
        return detail is null ? NotFound() : Ok(detail);
    }

    [HttpPost]
    [ProducesResponseType(typeof(KapPartnerDetailDto), StatusCodes.Status201Created)]
    public async Task<IActionResult> Create(
        [FromBody] CreateKapPartnerRequest request,
        CancellationToken cancellationToken)
    {
        if (!_access.GetAccess().Enabled)
            return NotFound();
        try
        {
            var created = await _partners.CreateAsync(request, cancellationToken);
            return Created($"/api/system/kap/partners/{created.Id}", created);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id:guid}")]
    [ProducesResponseType(typeof(KapPartnerDetailDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> Update(
        Guid id,
        [FromBody] UpdateKapPartnerRequest request,
        CancellationToken cancellationToken)
    {
        if (!_access.GetAccess().Enabled)
            return NotFound();
        try
        {
            var updated = await _partners.UpdateAsync(id, request, cancellationToken);
            return updated is null ? NotFound() : Ok(updated);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
