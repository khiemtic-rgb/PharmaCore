using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PharmaCore.Api.Authorization;
using PharmaCore.Application.Abstractions;
using PharmaCore.Application.CustomerApp;

namespace PharmaCore.Api.Controllers.CustomerApp;

[ApiController]
[Route("api/customer-app/family")]
[Authorize(Policy = CustomerAppPolicies.Authenticated)]
public sealed class CustomerAppFamilyController : ControllerBase
{
    private readonly ICustomerFamilyService _family;
    private readonly ICurrentCustomerAccessor _customer;

    public CustomerAppFamilyController(
        ICustomerFamilyService family,
        ICurrentCustomerAccessor customer)
    {
        _family = family;
        _customer = customer;
    }

    [HttpGet]
    [ProducesResponseType(typeof(CustomerFamilyMemberListResult), StatusCodes.Status200OK)]
    public async Task<IActionResult> List(CancellationToken cancellationToken) =>
        Ok(await _family.ListAsync(
            _customer.TenantId,
            _customer.CustomerAccountId,
            cancellationToken));

    [HttpPost]
    [ProducesResponseType(typeof(CustomerFamilyMemberDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Create(
        [FromBody] CreateCustomerFamilyMemberRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var created = await _family.CreateAsync(
                _customer.TenantId,
                _customer.CustomerAccountId,
                request,
                cancellationToken);
            return CreatedAtAction(nameof(List), new { id = created.Id }, created);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id:guid}")]
    [ProducesResponseType(typeof(CustomerFamilyMemberDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Update(
        Guid id,
        [FromBody] UpdateCustomerFamilyMemberRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var updated = await _family.UpdateAsync(
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
        var ok = await _family.DeleteAsync(
            _customer.TenantId,
            _customer.CustomerAccountId,
            id,
            cancellationToken);
        return ok ? NoContent() : NotFound();
    }

    [HttpPatch("{id:guid}/notify-caregiver")]
    [ProducesResponseType(typeof(CustomerFamilyMemberDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> SetNotifyCaregiver(
        Guid id,
        [FromBody] SetFamilyNotifyCaregiverRequest request,
        CancellationToken cancellationToken)
    {
        var updated = await _family.SetNotifyCaregiverAsync(
            _customer.TenantId,
            _customer.CustomerAccountId,
            id,
            request.NotifyCaregiver,
            cancellationToken);
        return updated is null ? NotFound() : Ok(updated);
    }
}
