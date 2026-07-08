using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using KitPlatform.Api.Authorization;
using KitPlatform.Application.Core;
using KitPlatform.Packs.Survey;

namespace KitPlatform.Api.Controllers.Survey;

[ApiController]
[Route("api/survey/campaigns")]
[Authorize]
[RequirePlatformModule(PlatformModuleCodes.PharmacySurvey)]
public sealed class SurveyCampaignsController : ControllerBase
{
    private readonly ISurveyCampaignService _campaigns;

    public SurveyCampaignsController(ISurveyCampaignService campaigns) => _campaigns = campaigns;

    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<SurveyCampaignDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<SurveyCampaignDto>>> List(
        [FromQuery] string? status,
        CancellationToken cancellationToken) =>
        Ok(await _campaigns.ListAsync(status, cancellationToken));

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(SurveyCampaignDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<SurveyCampaignDto>> Get(Guid id, CancellationToken cancellationToken)
    {
        var item = await _campaigns.GetAsync(id, cancellationToken);
        return item is null ? NotFound() : Ok(item);
    }

    [HttpPost]
    [ProducesResponseType(typeof(SurveyCampaignDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<SurveyCampaignDto>> Create(
        [FromBody] CreateSurveyCampaignRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var created = await _campaigns.CreateAsync(request, cancellationToken);
            return CreatedAtAction(nameof(Get), new { id = created.Id }, created);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id:guid}")]
    [ProducesResponseType(typeof(SurveyCampaignDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<SurveyCampaignDto>> Update(
        Guid id,
        [FromBody] UpdateSurveyCampaignRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var updated = await _campaigns.UpdateAsync(id, request, cancellationToken);
            return updated is null ? NotFound() : Ok(updated);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Archive(Guid id, CancellationToken cancellationToken) =>
        await _campaigns.ArchiveAsync(id, cancellationToken) ? NoContent() : NotFound();
}
