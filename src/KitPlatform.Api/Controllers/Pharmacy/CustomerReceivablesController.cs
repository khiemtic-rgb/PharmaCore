using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using KitPlatform.Api.Authorization;
using KitPlatform.Packs.Pharmacy.Sales;

namespace KitPlatform.Api.Controllers.Pharmacy;

[ApiController]
[Authorize]
[Route("api/sales/customer-receivables")]
public sealed class CustomerReceivablesController : ControllerBase
{
    private readonly ICustomerReceivablesService _receivables;

    public CustomerReceivablesController(ICustomerReceivablesService receivables) => _receivables = receivables;

    [HttpGet]
    [Authorize(Policy = SalesPolicies.Read)]
    public async Task<ActionResult<IReadOnlyList<CustomerReceivablesRowDto>>> Summary(
        CancellationToken cancellationToken) =>
        Ok(await _receivables.GetSummaryAsync(cancellationToken));

    [HttpGet("{customerId:guid}")]
    [Authorize(Policy = SalesPolicies.Read)]
    public async Task<ActionResult<CustomerReceivablesDetailDto>> Detail(
        Guid customerId,
        CancellationToken cancellationToken)
    {
        var detail = await _receivables.GetDetailAsync(customerId, cancellationToken);
        return detail is null ? NotFound() : Ok(detail);
    }
}
