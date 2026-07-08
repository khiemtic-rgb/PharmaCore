using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using KitPlatform.Api.Authorization;
using KitPlatform.Application.Identity;

namespace KitPlatform.Api.Controllers.IdentityAdmin;

[ApiController]
[Authorize]
[Route("api/system/branches")]
public sealed class SystemBranchesController : ControllerBase
{
    private readonly IIdentityAdminService _identity;

    public SystemBranchesController(IIdentityAdminService identity) => _identity = identity;

    [HttpGet]
    [Authorize(Policy = IdentityPolicies.Read)]
    public async Task<ActionResult<IReadOnlyList<BranchAdminListItemDto>>> List(CancellationToken cancellationToken) =>
        Ok(await _identity.ListBranchesAsync(cancellationToken));

    [HttpGet("{branchId:guid}")]
    [Authorize(Policy = IdentityPolicies.Read)]
    public async Task<ActionResult<BranchDetailDto>> Get(Guid branchId, CancellationToken cancellationToken)
    {
        var item = await _identity.GetBranchAsync(branchId, cancellationToken);
        return item is null ? NotFound() : Ok(item);
    }

    [HttpPost]
    [Authorize(Policy = IdentityPolicies.Write)]
    public async Task<ActionResult<BranchDetailDto>> Create(
        [FromBody] CreateBranchRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var item = await _identity.CreateBranchAsync(request, cancellationToken);
            return CreatedAtAction(nameof(Get), new { branchId = item.Id }, item);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{branchId:guid}")]
    [Authorize(Policy = IdentityPolicies.Write)]
    public async Task<ActionResult<BranchDetailDto>> Update(
        Guid branchId,
        [FromBody] UpdateBranchRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var item = await _identity.UpdateBranchAsync(branchId, request, cancellationToken);
            return item is null ? NotFound() : Ok(item);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpDelete("{branchId:guid}")]
    [Authorize(Policy = IdentityPolicies.Write)]
    public async Task<IActionResult> Delete(Guid branchId, CancellationToken cancellationToken)
    {
        try
        {
            var deleted = await _identity.DeleteBranchAsync(branchId, cancellationToken);
            return deleted ? NoContent() : NotFound();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
