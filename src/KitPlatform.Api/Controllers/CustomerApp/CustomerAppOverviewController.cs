using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using KitPlatform.Api.Authorization;
using KitPlatform.Application.Abstractions;
using KitPlatform.Application.Core;
using KitPlatform.Application.CustomerApp;

namespace KitPlatform.Api.Controllers.CustomerApp;

[ApiController]
[Route("api/customer-app/overview")]
[Authorize(Policy = CustomerAppPolicies.Authenticated)]
[RequirePlatformModule(PlatformModuleCodes.CustomerApp)]
public sealed class CustomerAppOverviewController : ControllerBase
{
    private readonly ICustomerAppOverviewService _overview;
    private readonly ICurrentCustomerAccessor _customer;

    public CustomerAppOverviewController(
        ICustomerAppOverviewService overview,
        ICurrentCustomerAccessor customer)
    {
        _overview = overview;
        _customer = customer;
    }

    [HttpGet("home-summary")]
    [ProducesResponseType(typeof(CustomerHomeSummaryDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> HomeSummary(CancellationToken cancellationToken) =>
        Ok(await _overview.GetHomeSummaryAsync(
            _customer.TenantId,
            _customer.CustomerId,
            _customer.CustomerAccountId,
            cancellationToken));

    [HttpGet("orders")]
    [ProducesResponseType(typeof(CustomerOrdersOverviewDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> Orders(CancellationToken cancellationToken) =>
        Ok(await _overview.GetOrdersOverviewAsync(
            _customer.TenantId,
            _customer.CustomerId,
            cancellationToken));

    [HttpGet("reminders")]
    [ProducesResponseType(typeof(CustomerRemindersOverviewDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> Reminders(CancellationToken cancellationToken) =>
        Ok(await _overview.GetRemindersOverviewAsync(
            _customer.TenantId,
            _customer.CustomerId,
            _customer.CustomerAccountId,
            cancellationToken));

    [HttpGet("chat")]
    [ProducesResponseType(typeof(CustomerChatOverviewDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> Chat(CancellationToken cancellationToken) =>
        Ok(await _overview.GetChatOverviewAsync(
            _customer.TenantId,
            _customer.CustomerId,
            cancellationToken));
}
