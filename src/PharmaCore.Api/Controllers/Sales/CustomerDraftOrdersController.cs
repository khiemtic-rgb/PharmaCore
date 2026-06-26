using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PharmaCore.Api.Authorization;
using PharmaCore.Application.Abstractions;
using PharmaCore.Application.CustomerApp;

namespace PharmaCore.Api.Controllers.Sales;

[ApiController]
[Route("api/sales/customer-draft-orders")]
public sealed class CustomerDraftOrdersController : ControllerBase
{
    private readonly ICustomerDraftOrderService _draftOrders;
    private readonly ITenantContext _tenant;

    public CustomerDraftOrdersController(
        ICustomerDraftOrderService draftOrders,
        ITenantContext tenant)
    {
        _draftOrders = draftOrders;
        _tenant = tenant;
    }

    [HttpGet]
    [Authorize(Policy = SalesPolicies.Read)]
    [ProducesResponseType(typeof(CustomerDraftOrderListResult), StatusCodes.Status200OK)]
    public async Task<IActionResult> List(
        [FromQuery] Guid? customerId,
        [FromQuery] short[]? status,
        CancellationToken cancellationToken) =>
        Ok(await _draftOrders.ListForStaffAsync(_tenant.TenantId, customerId, status, cancellationToken));

    [HttpGet("{id:guid}")]
    [Authorize(Policy = SalesPolicies.Read)]
    [ProducesResponseType(typeof(CustomerDraftOrderDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Get(Guid id, CancellationToken cancellationToken)
    {
        var order = await _draftOrders.GetForStaffAsync(_tenant.TenantId, id, cancellationToken);
        return order is null ? NotFound() : Ok(order);
    }

    [HttpPost]
    [Authorize(Policy = SalesPolicies.Write)]
    [ProducesResponseType(typeof(CustomerDraftOrderDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Create(
        [FromBody] UpsertCustomerDraftOrderRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var created = await _draftOrders.CreateAsync(
                _tenant.TenantId,
                _tenant.UserId,
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
    [Authorize(Policy = SalesPolicies.Write)]
    [ProducesResponseType(typeof(CustomerDraftOrderDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Update(
        Guid id,
        [FromBody] UpsertCustomerDraftOrderRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            return Ok(await _draftOrders.UpdateAsync(
                _tenant.TenantId,
                _tenant.UserId,
                id,
                request,
                cancellationToken));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{id:guid}/send")]
    [Authorize(Policy = SalesPolicies.Write)]
    [ProducesResponseType(typeof(CustomerDraftOrderDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Send(Guid id, CancellationToken cancellationToken)
    {
        try
        {
            return Ok(await _draftOrders.SendAsync(
                _tenant.TenantId,
                _tenant.UserId,
                id,
                cancellationToken));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{id:guid}/cancel")]
    [Authorize(Policy = SalesPolicies.Write)]
    [ProducesResponseType(typeof(CustomerDraftOrderDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Cancel(Guid id, CancellationToken cancellationToken)
    {
        try
        {
            return Ok(await _draftOrders.CancelAsync(
                _tenant.TenantId,
                _tenant.UserId,
                id,
                cancellationToken));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("{id:guid}/pos-load")]
    [Authorize(Policy = SalesPolicies.Read)]
    [ProducesResponseType(typeof(CustomerDraftOrderPosLoadDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> PosLoad(Guid id, CancellationToken cancellationToken)
    {
        var payload = await _draftOrders.GetPosLoadAsync(_tenant.TenantId, id, cancellationToken);
        return payload is null ? NotFound() : Ok(payload);
    }

    [HttpPost("{id:guid}/link-sale")]
    [Authorize(Policy = SalesPolicies.Write)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> LinkSale(
        Guid id,
        [FromBody] LinkCustomerDraftOrderRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            await _draftOrders.LinkSalesOrderAsync(_tenant.TenantId, id, request.SalesOrderId, cancellationToken);
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
