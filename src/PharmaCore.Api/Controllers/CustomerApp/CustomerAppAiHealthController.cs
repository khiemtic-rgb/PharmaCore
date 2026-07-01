using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PharmaCore.Api.Authorization;
using PharmaCore.Application.Abstractions;
using PharmaCore.Application.CustomerApp;

namespace PharmaCore.Api.Controllers.CustomerApp;

[ApiController]
[Route("api/customer-app/ai-health")]
[Authorize(Policy = CustomerAppPolicies.Authenticated)]
public sealed class CustomerAppAiHealthController : ControllerBase
{
    private readonly ICustomerAiHealthService _service;
    private readonly ICurrentCustomerAccessor _customer;

    public CustomerAppAiHealthController(
        ICustomerAiHealthService service,
        ICurrentCustomerAccessor customer)
    {
        _service = service;
        _customer = customer;
    }

    [HttpPost("ask")]
    [ProducesResponseType(typeof(AiHealthAskResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Ask(
        [FromBody] AiHealthAskRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            return Ok(await _service.AskAsync(
                _customer.TenantId,
                _customer.CustomerId,
                request,
                cancellationToken));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
