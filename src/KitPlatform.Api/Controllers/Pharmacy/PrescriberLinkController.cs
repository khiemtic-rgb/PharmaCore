using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using KitPlatform.Api.Authorization;
using KitPlatform.Packs.Pharmacy.Rx;

namespace KitPlatform.Api.Controllers.Pharmacy;

[ApiController]
[Authorize]
[Route("api/pharmacy/prescribers/links")]
public sealed class PrescriberLinkController : ControllerBase
{
    private readonly IPrescriberLinkService _links;

    public PrescriberLinkController(IPrescriberLinkService links) => _links = links;

    [HttpGet]
    [Authorize(Policy = RxPolicies.Read)]
    public async Task<ActionResult<IReadOnlyList<PrescriberTenantLinkDto>>> List(
        [FromQuery] string? status,
        CancellationToken cancellationToken = default) =>
        Ok(await _links.ListTenantLinksAsync(status, cancellationToken));

    [HttpGet("pending-approval")]
    [Authorize(Policy = RxPolicies.LinkManage)]
    public async Task<ActionResult<IReadOnlyList<PrescriberTenantLinkDto>>> PendingApproval(
        CancellationToken cancellationToken = default) =>
        Ok(await _links.ListPendingApprovalAsync(cancellationToken));

    [HttpPost("invite")]
    [Authorize(Policy = RxPolicies.LinkManage)]
    public async Task<ActionResult<PrescriberTenantLinkDto>> Invite(
        [FromBody] InvitePrescriberLinkRequest request,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var item = await _links.InvitePrescriberAsync(request, cancellationToken);
            return Ok(item);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{id:guid}/approve")]
    [Authorize(Policy = RxPolicies.LinkManage)]
    public async Task<ActionResult<PrescriberTenantLinkDto>> Approve(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var item = await _links.ApproveLinkAsync(id, cancellationToken);
        return item is null ? NotFound() : Ok(item);
    }

    [HttpPost("{id:guid}/reject")]
    [Authorize(Policy = RxPolicies.LinkManage)]
    public async Task<ActionResult<PrescriberTenantLinkDto>> Reject(
        Guid id,
        [FromBody] RejectPrescriberLinkRequest? request,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var item = await _links.RejectLinkAsync(id, request, cancellationToken);
            return item is null ? NotFound() : Ok(item);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{id:guid}/revoke")]
    [Authorize(Policy = RxPolicies.LinkManage)]
    public async Task<ActionResult<PrescriberTenantLinkDto>> Revoke(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var item = await _links.RevokeLinkAsync(id, cancellationToken);
            return item is null ? NotFound() : Ok(item);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
