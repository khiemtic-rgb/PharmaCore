using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using KitPlatform.Api.Authorization;
using KitPlatform.Application.Core;
using KitPlatform.Packs.Pharmacy;

namespace KitPlatform.Api.Controllers.Pharmacy;

[ApiController]
[Route("api/pharmacy/dispensing-notes")]
[Authorize]
[RequirePlatformModule(PlatformModuleCodes.Sales)]
public sealed class PharmacyDispensingNotesController : ControllerBase
{
    private readonly IPharmacyDispensingNoteService _notes;

    public PharmacyDispensingNotesController(IPharmacyDispensingNoteService notes) => _notes = notes;

    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<PharmacyDispensingNoteDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<PharmacyDispensingNoteDto>>> List(
        [FromQuery] Guid salesOrderId,
        CancellationToken cancellationToken) =>
        Ok(await _notes.ListBySalesOrderAsync(salesOrderId, cancellationToken));

    [HttpPost]
    [ProducesResponseType(typeof(PharmacyDispensingNoteDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<PharmacyDispensingNoteDto>> Create(
        [FromBody] CreatePharmacyDispensingNoteRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var created = await _notes.CreateAsync(request, cancellationToken);
            return CreatedAtAction(nameof(List), new { salesOrderId = created.SalesOrderId }, created);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
