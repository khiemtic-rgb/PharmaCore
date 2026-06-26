using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PharmaCore.Api.Authorization;
using PharmaCore.Application.Abstractions;
using PharmaCore.Application.CustomerApp;

namespace PharmaCore.Api.Controllers.CustomerApp;

[ApiController]
[Route("api/customer-app/push")]
[Authorize(Policy = CustomerAppPolicies.Authenticated)]
public sealed class CustomerAppPushController : ControllerBase
{
    private readonly ICustomerPushService _push;
    private readonly ICurrentCustomerAccessor _customer;

    public CustomerAppPushController(
        ICustomerPushService push,
        ICurrentCustomerAccessor customer)
    {
        _push = push;
        _customer = customer;
    }

    [HttpGet("status")]
    [ProducesResponseType(typeof(PushSubscriptionStatusDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> Status(CancellationToken cancellationToken) =>
        Ok(await _push.GetStatusAsync(
            _customer.TenantId,
            _customer.CustomerAccountId,
            cancellationToken));

    [HttpPost("subscribe")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Subscribe(
        [FromBody] RegisterPushSubscriptionRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            await _push.RegisterSubscriptionAsync(
                _customer.TenantId,
                _customer.CustomerAccountId,
                request,
                cancellationToken);
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpDelete("subscribe")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Unsubscribe(
        [FromQuery] string endpoint,
        CancellationToken cancellationToken)
    {
        try
        {
            await _push.UnregisterSubscriptionAsync(
                _customer.TenantId,
                _customer.CustomerAccountId,
                endpoint,
                cancellationToken);
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
