using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using KitPlatform.Api.Authorization;
using KitPlatform.Application.Abstractions;
using KitPlatform.Application.Core;
using KitPlatform.Packs.Pharmacy.CustomerApp;

namespace KitPlatform.Api.Controllers.CustomerApp;

[ApiController]
[Route("api/customer-app/active-medications")]
[Authorize(Policy = CustomerAppPolicies.Authenticated)]
[RequirePlatformModule(PlatformModuleCodes.CustomerApp)]
[RequirePlatformModule(PlatformModuleCodes.Medication)]
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
    public async Task<IActionResult> List(
        [FromQuery] Guid? familyMemberId,
        [FromQuery] bool forSelf = false,
        CancellationToken cancellationToken = default) =>
        Ok(await _service.ListAsync(
            _customer.TenantId,
            _customer.CustomerId,
            familyMemberId,
            forSelf,
            cancellationToken));
}
