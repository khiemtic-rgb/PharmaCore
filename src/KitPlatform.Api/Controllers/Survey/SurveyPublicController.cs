using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Options;
using KitPlatform.Packs.Survey;

namespace KitPlatform.Api.Controllers.Survey;

/// <summary>Public KAP / assessment endpoints (legacy route <c>/api/public/assessment</c> preserved).</summary>
[ApiController]
[Route("api/public/assessment")]
[AllowAnonymous]
[EnableRateLimiting("kap-public")]
public sealed class SurveyPublicController : ControllerBase
{
    private const string SessionHeaderName = "X-Assessment-Session";

    private readonly IAssessmentTemplateService _templates;
    private readonly IAssessmentSubmissionService _submissions;
    private readonly AssessmentSettings _settings;

    public SurveyPublicController(
        IAssessmentTemplateService templates,
        IAssessmentSubmissionService submissions,
        IOptions<AssessmentSettings> settings)
    {
        _templates = templates;
        _submissions = submissions;
        _settings = settings.Value;
    }

    [HttpGet("templates/{code}")]
    [ProducesResponseType(typeof(AssessmentTemplateDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetTemplate(
        string code,
        [FromQuery] string? version,
        CancellationToken cancellationToken)
    {
        var template = await _templates.GetByCodeAsync(code, version, cancellationToken);
        return template is null ? NotFoundError(AssessmentErrorCodes.NotFound, "Không tìm thấy template.") : Ok(template);
    }

    [HttpPost("submissions")]
    [ProducesResponseType(typeof(CreateAssessmentSubmissionResult), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> CreateSubmission(
        [FromBody] CreateAssessmentSubmissionRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
            var ua = Request.Headers.UserAgent.ToString();
            var result = await _submissions.CreateAsync(request, ip, ua, cancellationToken);

            Response.Cookies.Append(
                _settings.SessionCookieName,
                result.SessionToken,
                new CookieOptions
                {
                    HttpOnly = true,
                    SameSite = SameSiteMode.Lax,
                    MaxAge = TimeSpan.FromDays(_settings.SessionMaxAgeDays),
                    Path = "/",
                });

            return Created($"/api/public/assessment/submissions/{result.Id}", result);
        }
        catch (AssessmentException ex)
        {
            return AssessmentError(ex);
        }
    }

    [HttpGet("submissions/{id:guid}")]
    [ProducesResponseType(typeof(AssessmentSubmissionDetailDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetSubmission(Guid id, CancellationToken cancellationToken)
    {
        try
        {
            var token = ResolveSessionToken();
            var result = await _submissions.GetAsync(id, token, cancellationToken);
            return Ok(result);
        }
        catch (AssessmentException ex)
        {
            return AssessmentError(ex);
        }
    }

    [HttpPut("submissions/{id:guid}/responses")]
    [ProducesResponseType(typeof(SaveAssessmentResponsesResult), StatusCodes.Status200OK)]
    public async Task<IActionResult> SaveResponses(
        Guid id,
        [FromBody] SaveAssessmentResponsesRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var token = ResolveSessionToken();
            var result = await _submissions.SaveResponsesAsync(id, token, request, cancellationToken);
            return Ok(result);
        }
        catch (AssessmentException ex)
        {
            return AssessmentError(ex);
        }
    }

    [HttpPost("submissions/{id:guid}/complete")]
    [ProducesResponseType(typeof(CompleteAssessmentResult), StatusCodes.Status200OK)]
    public async Task<IActionResult> Complete(Guid id, CancellationToken cancellationToken)
    {
        try
        {
            var token = ResolveSessionToken();
            var result = await _submissions.CompleteAsync(id, token, cancellationToken);
            return Ok(result);
        }
        catch (AssessmentException ex)
        {
            return AssessmentError(ex);
        }
    }

    [HttpPost("submissions/{id:guid}/capture-lead")]
    [ProducesResponseType(typeof(CaptureAssessmentLeadResult), StatusCodes.Status200OK)]
    public async Task<IActionResult> CaptureLead(
        Guid id,
        [FromBody] CaptureAssessmentLeadRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var token = ResolveSessionToken();
            var result = await _submissions.CaptureLeadAsync(id, token, request, cancellationToken);
            return Ok(result);
        }
        catch (AssessmentException ex)
        {
            return AssessmentError(ex);
        }
    }

    [HttpGet("submissions/{id:guid}/report")]
    [ProducesResponseType(typeof(AssessmentFullReportDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetReport(Guid id, CancellationToken cancellationToken)
    {
        try
        {
            var token = ResolveSessionToken();
            var result = await _submissions.GetReportAsync(id, token, cancellationToken);
            return Ok(result);
        }
        catch (AssessmentException ex)
        {
            return AssessmentError(ex);
        }
    }

    [HttpGet("submissions/{id:guid}/report.pdf")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> GetReportPdf(
        Guid id,
        [FromQuery] string? kind,
        CancellationToken cancellationToken)
    {
        try
        {
            var token = ResolveSessionToken();
            var pdfKind = KapReportPdfKindParser.Parse(kind);
            var (content, fileName, contentType) = await _submissions.GetReportPdfAsync(id, token, pdfKind, cancellationToken);
            return File(content, contentType, fileName);
        }
        catch (AssessmentException ex)
        {
            return AssessmentError(ex);
        }
        catch (Exception)
        {
            return StatusCode(500, new { code = "pdf_generation_failed", message = "Không tạo được PDF. Vui lòng thử lại sau." });
        }
    }

    private string ResolveSessionToken()
    {
        if (Request.Headers.TryGetValue(SessionHeaderName, out var header) && !string.IsNullOrWhiteSpace(header))
            return header.ToString().Trim();

        if (Request.Cookies.TryGetValue(_settings.SessionCookieName, out var cookie) && !string.IsNullOrWhiteSpace(cookie))
            return cookie.Trim();

        return "";
    }

    private IActionResult AssessmentError(AssessmentException ex) =>
        StatusCode(ex.StatusCode, new { code = ex.ErrorCode, message = ex.Message });

    private IActionResult NotFoundError(string code, string message) =>
        NotFound(new { code, message });
}
