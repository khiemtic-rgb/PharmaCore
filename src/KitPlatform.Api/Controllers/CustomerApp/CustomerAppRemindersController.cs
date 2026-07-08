using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using KitPlatform.Api.Authorization;
using KitPlatform.Application.Abstractions;
using KitPlatform.Application.Core;
using KitPlatform.Application.CustomerApp;

namespace KitPlatform.Api.Controllers.CustomerApp;

[ApiController]
[Route("api/customer-app/reminders")]
[Authorize(Policy = CustomerAppPolicies.Authenticated)]
[RequirePlatformModule(PlatformModuleCodes.CustomerApp)]
[RequirePlatformModule(PlatformModuleCodes.Medication)]
public sealed class CustomerAppRemindersController : ControllerBase
{
    private readonly ICustomerReminderService _reminders;
    private readonly ICurrentCustomerAccessor _customer;

    public CustomerAppRemindersController(
        ICustomerReminderService reminders,
        ICurrentCustomerAccessor customer)
    {
        _reminders = reminders;
        _customer = customer;
    }

    [HttpGet]
    [ProducesResponseType(typeof(MedicationReminderListResult), StatusCodes.Status200OK)]
    public async Task<IActionResult> List(
        [FromQuery] bool includeInactive = false,
        CancellationToken cancellationToken = default) =>
        Ok(await _reminders.ListAsync(
            _customer.TenantId,
            _customer.CustomerId,
            includeInactive,
            cancellationToken));

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(MedicationReminderDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Get(Guid id, CancellationToken cancellationToken)
    {
        var item = await _reminders.GetAsync(_customer.TenantId, _customer.CustomerId, id, cancellationToken);
        return item is null ? NotFound() : Ok(item);
    }

    [HttpPost]
    [ProducesResponseType(typeof(MedicationReminderDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Create(
        [FromBody] CreateMedicationReminderRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var created = await _reminders.CreateAsync(
                _customer.TenantId,
                _customer.CustomerId,
                request,
                cancellationToken);
            return CreatedAtAction(nameof(Get), new { id = created.Id }, created);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id:guid}")]
    [ProducesResponseType(typeof(MedicationReminderDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Update(
        Guid id,
        [FromBody] UpdateMedicationReminderRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var updated = await _reminders.UpdateAsync(
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

    /// <summary>Tắt nhắc (soft delete — giữ lịch sử, set is_active=false).</summary>
    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Deactivate(Guid id, CancellationToken cancellationToken)
    {
        var ok = await _reminders.DeactivateAsync(
            _customer.TenantId,
            _customer.CustomerId,
            id,
            cancellationToken);
        return ok ? NoContent() : NotFound();
    }
}
