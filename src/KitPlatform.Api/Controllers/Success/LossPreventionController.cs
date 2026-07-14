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
}
