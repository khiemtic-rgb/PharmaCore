using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PharmaCore.Api.Authorization;
using PharmaCore.Application.Abstractions;
using PharmaCore.Application.CustomerApp;

namespace PharmaCore.Api.Controllers.CustomerApp;

[ApiController]
[Route("api/customer-app/active-medications")]
[Authorize(Policy = CustomerAppPolicies.Authenticated)]
public sealed class CustomerAppActiveMedicationsController : ControllerBase
{
    private readonly ICustomerActiveMedicationService _service;
    private readonly ICurrentCustomerAccessor _customer;

    public CustomerAppActiveMedicationsController(
        ICustomerActiveMedicationService service,
        ICurrentCustomerAccessor customer)
    {
        _service = service;
        _customer = customer;
    }

    [HttpGet]
    [ProducesResponseType(typeof(ActiveMedicationListResult), StatusCodes.Status200OK)]
    public async Task<IActionResult> List(CancellationToken cancellationToken) =>
        Ok(await _service.ListAsync(_customer.TenantId, _customer.CustomerId, cancellationToken));
}
