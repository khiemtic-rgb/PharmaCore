using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PharmaCore.Api.Authorization;
using PharmaCore.Application.Abstractions;
using PharmaCore.Application.CustomerApp;

namespace PharmaCore.Api.Controllers.CustomerApp;

[ApiController]
[Route("api/customer-app/care-reminders")]
[Authorize(Policy = CustomerAppPolicies.Authenticated)]
public sealed class CustomerAppCareRemindersController : ControllerBase
{
    private readonly ICustomerCareReminderService _careReminders;
    private readonly ICurrentCustomerAccessor _customer;

    public CustomerAppCareRemindersController(
        ICustomerCareReminderService careReminders,
        ICurrentCustomerAccessor customer)
    {
        _careReminders = careReminders;
        _customer = customer;
    }

    [HttpGet]
    [ProducesResponseType(typeof(CustomerCareReminderListResult), StatusCodes.Status200OK)]
    public async Task<IActionResult> List(
        [FromQuery] bool includeDone = false,
        CancellationToken cancellationToken = default) =>
        Ok(await _careReminders.ListAsync(
            _customer.TenantId,
            _customer.CustomerAccountId,
            includeDone,
            cancellationToken));

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(CustomerCareReminderDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Get(Guid id, CancellationToken cancellationToken)
    {
        var item = await _careReminders.GetAsync(
            _customer.TenantId,
            _customer.CustomerAccountId,
            id,
            cancellationToken);
        return item is null ? NotFound() : Ok(item);
    }

    [HttpPost]
    [ProducesResponseType(typeof(CustomerCareReminderDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Create(
        [FromBody] CreateCustomerCareReminderRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var created = await _careReminders.CreateAsync(
                _customer.TenantId,
                _customer.CustomerAccountId,
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
    [ProducesResponseType(typeof(CustomerCareReminderDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Update(
        Guid id,
        [FromBody] UpdateCustomerCareReminderRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var updated = await _careReminders.UpdateAsync(
                _customer.TenantId,
                _customer.CustomerAccountId,
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

    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var ok = await _careReminders.DeleteAsync(
            _customer.TenantId,
            _customer.CustomerAccountId,
            id,
            cancellationToken);
        return ok ? NoContent() : NotFound();
    }
}
