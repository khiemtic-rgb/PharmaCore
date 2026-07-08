using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using KitPlatform.Api.Authorization;
using KitPlatform.Application.Abstractions;
using KitPlatform.Application.Core;
using KitPlatform.Application.Core.Engines;
using KitPlatform.Application.CustomerApp;

namespace KitPlatform.Api.Controllers.CustomerApp;

[ApiController]
[Route("api/customer-app/ai-health")]
[Authorize(Policy = CustomerAppPolicies.Authenticated)]
[RequirePlatformModule(PlatformModuleCodes.CustomerApp)]
[RequirePlatformModule(PlatformModuleCodes.HealthWallet)]
public sealed class CustomerAppAiHealthController : ControllerBase
{
    private readonly IAiOrchestrator _ai;
    private readonly ICurrentCustomerAccessor _customer;
    private readonly ICustomerEngagementEventService _engagementEvents;

    public CustomerAppAiHealthController(
        IAiOrchestrator ai,
        ICurrentCustomerAccessor customer,
        ICustomerEngagementEventService engagementEvents)
    {
        _ai = ai;
        _customer = customer;
        _engagementEvents = engagementEvents;
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
            var response = await _ai.AskAsync(
                _customer.TenantId,
                _customer.CustomerId,
                request,
                cancellationToken);
            await _engagementEvents.RecordEventAsync(
                _customer.TenantId,
                _customer.CustomerAccountId,
                _customer.CustomerId,
                CustomerEngagementEventTypes.AiAsk,
                cancellationToken: cancellationToken);
            return Ok(response);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
