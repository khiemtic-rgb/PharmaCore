using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using KitPlatform.Api.Authorization;
using KitPlatform.Application.Abstractions;
using KitPlatform.Packs.Pharmacy.Rx;

namespace KitPlatform.Api.Controllers.PrescriberPortal;

[ApiController]
[Authorize(Policy = PrescriberPortalPolicies.Authenticated)]
[Route("api/prescriber-portal/dashboard")]
public sealed class PrescriberPortalDashboardController : ControllerBase
{
    private readonly IPrescriberPortalPrescriptionService _prescriptions;
    private readonly ICurrentPrescriberAccessor _prescriber;

    public PrescriberPortalDashboardController(
        IPrescriberPortalPrescriptionService prescriptions,
        ICurrentPrescriberAccessor prescriber)
    {
        _prescriptions = prescriptions;
        _prescriber = prescriber;
    }

    [HttpGet]
    public async Task<ActionResult<PortalPrescriberDashboardDto>> Get(CancellationToken cancellationToken = default) =>
        Ok(await _prescriptions.GetDashboardAsync(_prescriber.PrescriberId, cancellationToken));
}
