using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using KitPlatform.Api.Authorization;
using KitPlatform.Application.Configuration;
using KitPlatform.Packs.Pharmacy.Inventory;

namespace KitPlatform.Api.Controllers.Pharmacy;

[ApiController]
[Authorize]
[Route("api/inventory/gpp-checklist")]
public sealed class GppChecklistController : ControllerBase
{
    private readonly ITenantSettingsService _settings;

    public GppChecklistController(ITenantSettingsService settings) => _settings = settings;

    [HttpGet]
    [Authorize(Policy = InventoryPolicies.Read)]
    public async Task<ActionResult<GppChecklistSettingsDto>> Get(CancellationToken cancellationToken) =>
        Ok(await _settings.GetGppChecklistAsync(cancellationToken));

    [HttpPut]
    [Authorize(Policy = InventoryPolicies.Write)]
    public async Task<ActionResult<GppChecklistSettingsDto>> Update(
        [FromBody] UpdateGppChecklistRequest request,
        CancellationToken cancellationToken) =>
        Ok(await _settings.UpdateGppChecklistAsync(request, cancellationToken));
}
