using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using KitPlatform.Api.Authorization;
using KitPlatform.Application.Core;
using KitPlatform.Packs.Clinic;

namespace KitPlatform.Api.Controllers.Clinic;

[ApiController]
[Route("api/clinic/appointments")]
[Authorize]
[RequirePlatformModule(PlatformModuleCodes.ClinicAppointments)]
public sealed class ClinicAppointmentsController : ControllerBase
{
    private readonly IClinicAppointmentService _appointments;

    public ClinicAppointmentsController(IClinicAppointmentService appointments) =>
        _appointments = appointments;

    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<ClinicAppointmentDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<ClinicAppointmentDto>>> List(
        [FromQuery] DateTimeOffset? from,
        [FromQuery] DateTimeOffset? to,
        CancellationToken cancellationToken) =>
        Ok(await _appointments.ListAsync(from, to, cancellationToken));

    [HttpPost]
    [ProducesResponseType(typeof(ClinicAppointmentDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ClinicAppointmentDto>> Create(
        [FromBody] CreateClinicAppointmentRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var created = await _appointments.CreateAsync(request, cancellationToken);
            return CreatedAtAction(nameof(List), new { id = created.Id }, created);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
