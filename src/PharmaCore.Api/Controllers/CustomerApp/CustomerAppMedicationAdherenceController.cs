using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PharmaCore.Api.Authorization;
using PharmaCore.Application.Abstractions;
using PharmaCore.Application.CustomerApp;

namespace PharmaCore.Api.Controllers.CustomerApp;

[ApiController]
[Route("api/customer-app/medication-adherence")]
[Authorize(Policy = CustomerAppPolicies.Authenticated)]
public sealed class CustomerAppMedicationAdherenceController : ControllerBase
{
    private readonly ICustomerMedicationAdherenceService _service;
    private readonly ICurrentCustomerAccessor _customer;

    public CustomerAppMedicationAdherenceController(
        ICustomerMedicationAdherenceService service,
        ICurrentCustomerAccessor customer)
    {
        _service = service;
        _customer = customer;
    }

    [HttpGet("summary")]
    [ProducesResponseType(typeof(MedicationAdherenceSummaryDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> Summary(CancellationToken cancellationToken) =>
        Ok(await _service.GetSummaryAsync(_customer.TenantId, _customer.CustomerId, cancellationToken));

    [HttpGet("due")]
    [ProducesResponseType(typeof(MedicationReminderListResult), StatusCodes.Status200OK)]
    public async Task<IActionResult> Due(CancellationToken cancellationToken) =>
        Ok(await _service.ListDueAsync(_customer.TenantId, _customer.CustomerId, cancellationToken));

    [HttpGet("family-due")]
    [ProducesResponseType(typeof(MedicationReminderListResult), StatusCodes.Status200OK)]
    public async Task<IActionResult> FamilyDue(CancellationToken cancellationToken) =>
        Ok(await _service.ListFamilyDueAsync(_customer.TenantId, _customer.CustomerId, cancellationToken));

    [HttpPost("reminders/{id:guid}/respond")]
    [ProducesResponseType(typeof(MedicationReminderDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Respond(
        Guid id,
        [FromBody] RespondMedicationReminderRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var updated = await _service.RespondAsync(
                _customer.TenantId,
                _customer.CustomerId,
                id,
                request,
                cancellationToken);
            return updated is null ? NotFound() : Ok(updated);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
