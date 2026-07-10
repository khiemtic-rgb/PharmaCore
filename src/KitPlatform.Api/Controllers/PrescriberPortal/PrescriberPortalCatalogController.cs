using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using KitPlatform.Api.Authorization;
using KitPlatform.Application.Abstractions;
using KitPlatform.Packs.Pharmacy.Rx;

namespace KitPlatform.Api.Controllers.PrescriberPortal;

[ApiController]
[Authorize(Policy = PrescriberPortalPolicies.Authenticated)]
[Route("api/prescriber-portal")]
public sealed class PrescriberPortalCatalogController : ControllerBase
{
    private readonly IPrescriberPortalPrescriptionService _prescriptions;
    private readonly ICurrentPrescriberAccessor _prescriber;

    public PrescriberPortalCatalogController(
        IPrescriberPortalPrescriptionService prescriptions,
        ICurrentPrescriberAccessor prescriber)
    {
        _prescriptions = prescriptions;
        _prescriber = prescriber;
    }

    [HttpGet("customers")]
    public async Task<ActionResult<IReadOnlyList<PortalCustomerSearchItemDto>>> SearchCustomers(
        [FromQuery] Guid tenantId,
        [FromQuery] string? q,
        CancellationToken cancellationToken = default)
    {
        try
        {
            return Ok(await _prescriptions.SearchCustomersAsync(_prescriber.PrescriberId, tenantId, q, cancellationToken));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("products")]
    public async Task<ActionResult<IReadOnlyList<PortalProductSearchItemDto>>> SearchProducts(
        [FromQuery] Guid tenantId,
        [FromQuery] string? q,
        CancellationToken cancellationToken = default)
    {
        try
        {
            return Ok(await _prescriptions.SearchProductsAsync(_prescriber.PrescriberId, tenantId, q, cancellationToken));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
