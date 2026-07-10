using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using KitPlatform.Api.Authorization;
using KitPlatform.Application.Abstractions;
using KitPlatform.Packs.Pharmacy.Rx;

namespace KitPlatform.Api.Controllers.PrescriberPortal;

[ApiController]
[Authorize(Policy = PrescriberPortalPolicies.Authenticated)]
[Route("api/prescriber-portal")]
public sealed class PrescriberPortalLinksController : ControllerBase
{
    private readonly IPrescriberLinkService _links;
    private readonly ICurrentPrescriberAccessor _prescriber;

    public PrescriberPortalLinksController(
        IPrescriberLinkService links,
        ICurrentPrescriberAccessor prescriber)
    {
        _links = links;
        _prescriber = prescriber;
    }

    [HttpGet("pharmacies")]
    public async Task<ActionResult<IReadOnlyList<PrescriberTenantLinkDto>>> MyPharmacies(
        [FromQuery] bool activeOnly = true,
        CancellationToken cancellationToken = default) =>
        Ok(await _links.ListMyPharmaciesAsync(_prescriber.PrescriberId, activeOnly, cancellationToken));

    [HttpGet("pharmacies/directory")]
    public async Task<ActionResult<IReadOnlyList<PharmacyDirectoryItemDto>>> Directory(
        [FromQuery] string? q,
        CancellationToken cancellationToken = default) =>
        Ok(await _links.SearchPharmacyDirectoryAsync(q, cancellationToken));

    [HttpGet("links/pending-invites")]
    public async Task<ActionResult<IReadOnlyList<PrescriberTenantLinkDto>>> PendingInvites(
        CancellationToken cancellationToken = default) =>
        Ok(await _links.ListPendingInvitesAsync(_prescriber.PrescriberId, cancellationToken));

    [HttpPost("links/request")]
    public async Task<ActionResult<PrescriberTenantLinkDto>> RequestLink(
        [FromBody] RequestPharmacyLinkRequest request,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var item = await _links.RequestPharmacyLinkAsync(_prescriber.PrescriberId, request, cancellationToken);
            return Ok(item);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("links/{id:guid}/accept")]
    public async Task<ActionResult<PrescriberTenantLinkDto>> Accept(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var item = await _links.AcceptInviteAsync(_prescriber.PrescriberId, id, cancellationToken);
            return item is null ? NotFound() : Ok(item);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("links/{id:guid}/reject")]
    public async Task<ActionResult<PrescriberTenantLinkDto>> Reject(
        Guid id,
        [FromBody] RejectPrescriberLinkRequest? request,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var item = await _links.DeclineInviteAsync(_prescriber.PrescriberId, id, request, cancellationToken);
            return item is null ? NotFound() : Ok(item);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
