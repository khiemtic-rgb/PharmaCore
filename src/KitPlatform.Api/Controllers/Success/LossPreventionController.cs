using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using KitPlatform.Api.Authorization;
using KitPlatform.Application.Success;

namespace KitPlatform.Api.Controllers.Success;

[ApiController]
[Authorize]
[Route("api/success/loss")]
public sealed class LossPreventionController : ControllerBase
{
    private readonly ILossPreventionService _loss;

    public LossPreventionController(ILossPreventionService loss) => _loss = loss;

    /// <summary>
    /// AC2 — today's cash variance from existing sales_shifts (opening/closing/expected/cash_variance).
    /// Does not invent counted_* columns; closing_cash is the counted amount.
    /// </summary>
    [HttpGet("cash-variance")]
    [Authorize(Policy = DashboardPolicies.Read)]
    [ProducesResponseType(typeof(LossCashVarianceTodayDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<LossCashVarianceTodayDto>> GetCashVarianceToday(
        [FromQuery] decimal? threshold = null,
        CancellationToken cancellationToken = default) =>
        Ok(await _loss.GetCashVarianceTodayAsync(threshold, cancellationToken));

    /// <summary>
    /// AC4 — cancellations / POS discounts / approved stock adjustments grouped by employee (as-built proxies).
    /// Default range: VN month-to-date (same helper as Reports).
    /// </summary>
    [HttpGet("reports/by-employee")]
    [Authorize(Policy = DashboardPolicies.Read)]
    [ProducesResponseType(typeof(LossEmployeeReportsDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<LossEmployeeReportsDto>> GetEmployeeReports(
        [FromQuery] DateTime? from = null,
        [FromQuery] DateTime? to = null,
        [FromQuery] Guid? branchId = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            return Ok(await _loss.GetEmployeeReportsAsync(from, to, branchId, cancellationToken));
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = ex.Message });
        }
    }

    /// <summary>
    /// AC1 — Loss audit feed from activity_log (dashboard.read). Filters: date, branch, eventType, userId.
    /// </summary>
    [HttpGet("audit-feed")]
    [Authorize(Policy = DashboardPolicies.Read)]
    [ProducesResponseType(typeof(LossAuditFeedDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<LossAuditFeedDto>> GetAuditFeed(
        [FromQuery] DateTime? from = null,
        [FromQuery] DateTime? to = null,
        [FromQuery] Guid? branchId = null,
        [FromQuery] Guid? userId = null,
        [FromQuery] string? eventType = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        CancellationToken cancellationToken = default)
    {
        try
        {
            return Ok(await _loss.GetAuditFeedAsync(
                from, to, branchId, userId, eventType, page, pageSize, cancellationToken));
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = ex.Message });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>AC3 — suggest 10–20 SKUs (hot 7d / min stock / random) for cycle count.</summary>
    [HttpGet("cycle-count/suggestions")]
    [Authorize(Policy = DashboardPolicies.Read)]
    [ProducesResponseType(typeof(LossCycleCountSuggestionsDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<LossCycleCountSuggestionsDto>> GetCycleCountSuggestions(
        [FromQuery] Guid? warehouseId = null,
        [FromQuery] Guid? branchId = null,
        [FromQuery] int limit = 15,
        CancellationToken cancellationToken = default)
    {
        try
        {
            return Ok(await _loss.GetCycleCountSuggestionsAsync(warehouseId, branchId, limit, cancellationToken));
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>AC3 — create inventory counting session tagged [cycle_count]; count UI stays inventory.</summary>
    [HttpPost("cycle-count/sessions")]
    [Authorize(Policy = InventoryPolicies.Write)]
    [ProducesResponseType(typeof(LossCycleCountSessionDto), StatusCodes.Status201Created)]
    public async Task<ActionResult<LossCycleCountSessionDto>> CreateCycleCountSession(
        [FromBody] CreateLossCycleCountSessionRequest request,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var item = await _loss.CreateCycleCountSessionAsync(
                request.WarehouseId, request.Limit <= 0 ? 15 : request.Limit, request.Note, cancellationToken);
            return Created(item.CountHref, item);
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("cycle-count/status")]
    [Authorize(Policy = DashboardPolicies.Read)]
    [ProducesResponseType(typeof(LossCycleCountStatusDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<LossCycleCountStatusDto>> GetCycleCountStatus(
        [FromQuery] Guid? branchId = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            return Ok(await _loss.GetCycleCountStatusTodayAsync(branchId, cancellationToken));
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = ex.Message });
        }
    }

    [HttpGet("cycle-count/variance")]
    [Authorize(Policy = DashboardPolicies.Read)]
    [ProducesResponseType(typeof(LossCycleCountVarianceReportDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<LossCycleCountVarianceReportDto>> GetCycleCountVariance(
        [FromQuery] DateTime? from = null,
        [FromQuery] DateTime? to = null,
        [FromQuery] Guid? branchId = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            return Ok(await _loss.GetCycleCountVarianceAsync(from, to, branchId, cancellationToken));
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = ex.Message });
        }
    }
}

public sealed record CreateLossCycleCountSessionRequest(
    Guid WarehouseId,
    int Limit = 15,
    string? Note = null);
