using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using KitPlatform.Api.Authorization;
using KitPlatform.Packs.Pharmacy.Rx;

namespace KitPlatform.Api.Controllers.Pharmacy;

[ApiController]
[Authorize]
[Route("api/pharmacy/prescribers")]
public sealed class PrescriberController : ControllerBase
{
    private readonly IPrescriptionService _prescriptions;

    public PrescriberController(IPrescriptionService prescriptions) => _prescriptions = prescriptions;

    [HttpGet]
    [Authorize(Policy = RxPolicies.Read)]
    public async Task<ActionResult<IReadOnlyList<LinkedPrescriberDto>>> List(
        [FromQuery] string? search,
        [FromQuery] bool activeOnly = false,
        CancellationToken cancellationToken = default) =>
        Ok(await _prescriptions.GetPrescribersAsync(search, activeOnly, cancellationToken));

    [HttpGet("{id:guid}")]
    [Authorize(Policy = RxPolicies.Read)]
    public async Task<ActionResult<LinkedPrescriberDto>> Get(Guid id, CancellationToken cancellationToken = default)
    {
        var item = await _prescriptions.GetPrescriberAsync(id, cancellationToken);
        return item is null ? NotFound() : Ok(item);
    }

    [HttpPost]
    [Authorize(Policy = RxPolicies.Write)]
    public async Task<ActionResult<LinkedPrescriberDto>> Create(
        [FromBody] CreateLinkedPrescriberRequest request,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var item = await _prescriptions.CreatePrescriberAsync(request, cancellationToken);
            return CreatedAtAction(nameof(Get), new { id = item.Id }, item);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = RxPolicies.Write)]
    public async Task<ActionResult<LinkedPrescriberDto>> Update(
        Guid id,
        [FromBody] UpdateLinkedPrescriberRequest request,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var item = await _prescriptions.UpdatePrescriberAsync(id, request, cancellationToken);
            return item is null ? NotFound() : Ok(item);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Policy = RxPolicies.Write)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken = default)
    {
        var ok = await _prescriptions.DeletePrescriberAsync(id, cancellationToken);
        return ok ? NoContent() : NotFound();
    }
}
