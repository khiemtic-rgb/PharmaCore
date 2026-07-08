using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using KitPlatform.Api.Authorization;
using KitPlatform.Application.Loyalty;

namespace KitPlatform.Api.Controllers.Loyalty;

[ApiController]
[Authorize]
[Route("api/loyalty/vouchers")]
public sealed class VouchersController : ControllerBase
{
    private readonly IVoucherAdminService _vouchers;

    public VouchersController(IVoucherAdminService vouchers) => _vouchers = vouchers;

    [HttpGet]
    [Authorize(Policy = SalesPolicies.Read)]
    [ProducesResponseType(typeof(VoucherListResult), StatusCodes.Status200OK)]
    public async Task<IActionResult> List(CancellationToken cancellationToken) =>
        Ok(await _vouchers.ListAsync(cancellationToken));

    [HttpGet("{id:guid}")]
    [Authorize(Policy = SalesPolicies.Read)]
    [ProducesResponseType(typeof(VoucherAdminDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Get(Guid id, CancellationToken cancellationToken)
    {
        var item = await _vouchers.GetAsync(id, cancellationToken);
        return item is null ? NotFound() : Ok(item);
    }

    [HttpPost]
    [Authorize(Policy = SalesPolicies.Write)]
    [ProducesResponseType(typeof(VoucherAdminDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> Create(
        [FromBody] UpsertVoucherRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            return Ok(await _vouchers.CreateAsync(request, cancellationToken));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = SalesPolicies.Write)]
    [ProducesResponseType(typeof(VoucherAdminDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> Update(
        Guid id,
        [FromBody] UpsertVoucherRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            return Ok(await _vouchers.UpdateAsync(id, request, cancellationToken));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{id:guid}/issue")]
    [Authorize(Policy = SalesPolicies.Write)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Issue(
        Guid id,
        [FromBody] IssueVoucherRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            await _vouchers.IssueAsync(id, request, cancellationToken);
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{id:guid}/issue-candidates/search")]
    [Authorize(Policy = SalesPolicies.Read)]
    [ProducesResponseType(typeof(VoucherIssueCandidateListResult), StatusCodes.Status200OK)]
    public async Task<IActionResult> SearchIssueCandidates(
        Guid id,
        [FromBody] VoucherIssueCandidateSearchRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            return Ok(await _vouchers.SearchIssueCandidatesAsync(id, request, cancellationToken));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{id:guid}/issue-bulk")]
    [Authorize(Policy = SalesPolicies.Write)]
    [ProducesResponseType(typeof(IssueVoucherBulkResult), StatusCodes.Status200OK)]
    public async Task<IActionResult> IssueBulk(
        Guid id,
        [FromBody] IssueVoucherBulkRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            return Ok(await _vouchers.IssueBulkAsync(id, request, cancellationToken));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("{id:guid}/issued")]
    [Authorize(Policy = SalesPolicies.Read)]
    [ProducesResponseType(typeof(IssuedCustomerVoucherListResult), StatusCodes.Status200OK)]
    public async Task<IActionResult> ListIssued(Guid id, CancellationToken cancellationToken) =>
        Ok(await _vouchers.ListIssuedAsync(id, cancellationToken));

    [HttpDelete("{id:guid}")]
    [Authorize(Policy = SalesPolicies.Write)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var (ok, error) = await _vouchers.DeleteAsync(id, cancellationToken);
        if (ok)
            return NoContent();
        if (error == "Voucher không tồn tại.")
            return NotFound(new { message = error });
        return BadRequest(new { message = error });
    }
}
