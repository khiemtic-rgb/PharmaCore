using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using KitPlatform.Api.Authorization;
using KitPlatform.Application.Core;
using KitPlatform.Packs.Clinic;

namespace KitPlatform.Api.Controllers.Clinic;

[ApiController]
[Route("api/crm/leads")]
[Authorize]
[RequirePlatformModule(PlatformModuleCodes.CrmLeads)]
public sealed class CrmLeadsController : ControllerBase
{
    private readonly ICrmLeadService _leads;

    public CrmLeadsController(ICrmLeadService leads) => _leads = leads;

    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<CrmLeadDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<CrmLeadDto>>> List(
        [FromQuery] string? status,
        CancellationToken cancellationToken) =>
        Ok(await _leads.ListAsync(status, cancellationToken));

    [HttpPost]
    [ProducesResponseType(typeof(CrmLeadDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<CrmLeadDto>> Create(
        [FromBody] CreateCrmLeadRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var created = await _leads.CreateAsync(request, cancellationToken);
            return CreatedAtAction(nameof(List), new { id = created.Id }, created);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
