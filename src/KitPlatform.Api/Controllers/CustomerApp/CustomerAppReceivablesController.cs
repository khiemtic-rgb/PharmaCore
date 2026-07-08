using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using KitPlatform.Api.Authorization;
using KitPlatform.Application.Abstractions;
using KitPlatform.Application.Core;
using KitPlatform.Application.CustomerApp;

namespace KitPlatform.Api.Controllers.CustomerApp;

[ApiController]
[Route("api/customer-app/receivables")]
[Authorize(Policy = CustomerAppPolicies.Authenticated)]
[RequirePlatformModule(PlatformModuleCodes.CustomerApp)]
public sealed class CustomerAppReceivablesController : ControllerBase
{
    private readonly ICustomerAppReceivablesService _receivables;
    private readonly ICurrentCustomerAccessor _customer;

    public CustomerAppReceivablesController(
        ICustomerAppReceivablesService receivables,
        ICurrentCustomerAccessor customer)
    {
        _receivables = receivables;
        _customer = customer;
    }

    /// <summary>Tổng còn nợ và danh sách đơn bán chưa trả đủ (chỉ xem).</summary>
    [HttpGet]
    [ProducesResponseType(typeof(CustomerReceivablesSummaryDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> Summary(CancellationToken cancellationToken) =>
        Ok(await _receivables.GetSummaryAsync(
            _customer.TenantId,
            _customer.CustomerId,
            cancellationToken));

    /// <summary>Chi tiết một đơn còn nợ (chỉ xem — thu nợ tại quầy).</summary>
    [HttpGet("orders/{id:guid}")]
    [ProducesResponseType(typeof(CustomerPurchaseDetailDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetOrder(Guid id, CancellationToken cancellationToken)
    {
        var order = await _receivables.GetOrderAsync(
            _customer.TenantId,
            _customer.CustomerId,
            id,
            cancellationToken);
        return order is null ? NotFound() : Ok(order);
    }
}
