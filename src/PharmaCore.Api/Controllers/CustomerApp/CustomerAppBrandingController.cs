using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PharmaCore.Application.CustomerApp;

namespace PharmaCore.Api.Controllers.CustomerApp;

[ApiController]
[Route("api/customer-app/branding")]
[AllowAnonymous]
public sealed class CustomerAppBrandingController : ControllerBase
{
    private readonly ICustomerAppBrandingService _branding;

    public CustomerAppBrandingController(ICustomerAppBrandingService branding) => _branding = branding;

    [HttpGet]
    [ProducesResponseType(typeof(CustomerAppBrandingDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Get(
        [FromQuery] string tenantCode,
        CancellationToken cancellationToken)
    {
        var branding = await _branding.GetByTenantCodeAsync(tenantCode, cancellationToken);
        return branding is null ? NotFound() : Ok(branding);
    }
}
