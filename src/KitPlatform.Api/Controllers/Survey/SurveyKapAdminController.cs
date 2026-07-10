using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using KitPlatform.Packs.Survey;

namespace KitPlatform.Api.Controllers.Survey;

[ApiController]
[Authorize(Roles = "ADMIN")]
[Route("api/system/kap")]
public sealed class SurveyKapAdminController : ControllerBase
{
    private readonly IAssessmentKapAdminService _kap;
    private readonly IAssessmentAdminService _submissions;

    public SurveyKapAdminController(
        IAssessmentKapAdminService kap,
        IAssessmentAdminService submissions)
    {
        _kap = kap;
        _submissions = submissions;
    }

    [HttpGet("access")]
    [ProducesResponseType(typeof(AssessmentAdminAccessDto), StatusCodes.Status200OK)]
    public ActionResult<AssessmentAdminAccessDto> GetAccess() => Ok(_submissions.GetAccess());

    [HttpGet("templates")]
    [ProducesResponseType(typeof(IReadOnlyList<KapTemplateListItemDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<KapTemplateListItemDto>>> ListTemplates(
        CancellationToken cancellationToken)
    {
        try
        {
            return Ok(await _kap.ListTemplatesAsync(cancellationToken));
        }
        catch (UnauthorizedAccessException)
        {
            return NotFound();
        }
    }

    [HttpGet("templates/{id:guid}")]
    [ProducesResponseType(typeof(KapTemplateDetailDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<KapTemplateDetailDto>> GetTemplate(
        Guid id,
        CancellationToken cancellationToken)
    {
        try
        {
            var detail = await _kap.GetTemplateAsync(id, cancellationToken);
            return detail is null ? NotFound() : Ok(detail);
        }
        catch (UnauthorizedAccessException)
        {
            return NotFound();
        }
    }

    [HttpPut("templates/{id:guid}")]
    [ProducesResponseType(typeof(KapTemplateDetailDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<KapTemplateDetailDto>> UpdateTemplate(
        Guid id,
        [FromBody] UpdateKapTemplateRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var detail = await _kap.UpdateTemplateAsync(id, request, cancellationToken);
            return detail is null ? NotFound() : Ok(detail);
        }
        catch (UnauthorizedAccessException)
        {
            return NotFound();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("templates/{templateId:guid}/rules")]
    [ProducesResponseType(typeof(IReadOnlyList<KapRuleDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<KapRuleDto>>> ListRules(
        Guid templateId,
        CancellationToken cancellationToken)
    {
        try
        {
            return Ok(await _kap.ListRulesAsync(templateId, cancellationToken));
        }
        catch (UnauthorizedAccessException)
        {
            return NotFound();
        }
    }

    [HttpPost("rules")]
    [ProducesResponseType(typeof(KapRuleDto), StatusCodes.Status201Created)]
    public async Task<ActionResult<KapRuleDto>> CreateRule(
        [FromBody] CreateKapRuleRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var rule = await _kap.CreateRuleAsync(request, cancellationToken);
            return Created($"/api/system/kap/rules/{rule.Id}", rule);
        }
        catch (UnauthorizedAccessException)
        {
            return NotFound();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("rules/{id:guid}")]
    [ProducesResponseType(typeof(KapRuleDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<KapRuleDto>> UpdateRule(
        Guid id,
        [FromBody] UpdateKapRuleRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var rule = await _kap.UpdateRuleAsync(id, request, cancellationToken);
            return rule is null ? NotFound() : Ok(rule);
        }
        catch (UnauthorizedAccessException)
        {
            return NotFound();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpDelete("rules/{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> DeleteRule(Guid id, CancellationToken cancellationToken)
    {
        try
        {
            return await _kap.DeleteRuleAsync(id, cancellationToken) ? NoContent() : NotFound();
        }
        catch (UnauthorizedAccessException)
        {
            return NotFound();
        }
    }
}
