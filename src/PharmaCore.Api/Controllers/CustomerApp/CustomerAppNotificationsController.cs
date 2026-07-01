using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PharmaCore.Api.Authorization;
using PharmaCore.Application.Abstractions;
using PharmaCore.Application.CustomerApp;

namespace PharmaCore.Api.Controllers.CustomerApp;

[ApiController]
[Route("api/customer-app/notifications")]
[Authorize(Policy = CustomerAppPolicies.Authenticated)]
public sealed class CustomerAppNotificationsController : ControllerBase
{
    private readonly ICustomerNotificationService _notifications;
    private readonly ICurrentCustomerAccessor _customer;

    public CustomerAppNotificationsController(
        ICustomerNotificationService notifications,
        ICurrentCustomerAccessor customer)
    {
        _notifications = notifications;
        _customer = customer;
    }

    [HttpGet]
    [ProducesResponseType(typeof(CustomerNotificationListResult), StatusCodes.Status200OK)]
    public async Task<IActionResult> List(
        [FromQuery] int limit = 50,
        CancellationToken cancellationToken = default) =>
        Ok(await _notifications.ListAsync(
            _customer.TenantId,
            _customer.CustomerId,
            limit,
            cancellationToken));

    [HttpPost("{id:guid}/read")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> MarkRead(Guid id, CancellationToken cancellationToken)
    {
        var ok = await _notifications.MarkReadAsync(
            _customer.TenantId,
            _customer.CustomerId,
            id,
            cancellationToken);
        return ok ? NoContent() : NotFound();
    }

    [HttpPost("read-all")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> MarkAllRead(CancellationToken cancellationToken)
    {
        await _notifications.MarkAllReadAsync(
            _customer.TenantId,
            _customer.CustomerId,
            cancellationToken);
        return NoContent();
    }
}
