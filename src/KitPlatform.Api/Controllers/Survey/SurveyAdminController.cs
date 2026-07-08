using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using KitPlatform.Packs.Survey;

namespace KitPlatform.Api.Controllers.Survey;

[ApiController]
[Authorize(Roles = "ADMIN")]
[Route("api/system/assessment")]
public sealed class SurveyAdminController : ControllerBase
{
    private readonly IAssessmentAdminService _admin;

    public SurveyAdminController(IAssessmentAdminService admin) => _admin = admin;

    [HttpGet("access")]
    [ProducesResponseType(typeof(AssessmentAdminAccessDto), StatusCodes.Status200OK)]
    public ActionResult<AssessmentAdminAccessDto> GetAccess() => Ok(_admin.GetAccess());

    [HttpGet("submissions")]
    [ProducesResponseType(typeof(AssessmentSubmissionListResultDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<AssessmentSubmissionListResultDto>> ListSubmissions(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? status = null,
        [FromQuery] bool? hasLead = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            return Ok(await _admin.ListSubmissionsAsync(
                new AssessmentSubmissionListQuery(page, pageSize, status, hasLead),
                cancellationToken));
        }
        catch (UnauthorizedAccessException)
        {
            return NotFound();
        }
    }

    [HttpGet("submissions/{id:guid}")]
    [ProducesResponseType(typeof(AssessmentSubmissionDetailAdminDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<AssessmentSubmissionDetailAdminDto>> GetSubmission(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var detail = await _admin.GetSubmissionAsync(id, cancellationToken);
            return detail is null ? NotFound() : Ok(detail);
        }
        catch (UnauthorizedAccessException)
        {
            return NotFound();
        }
    }
}
