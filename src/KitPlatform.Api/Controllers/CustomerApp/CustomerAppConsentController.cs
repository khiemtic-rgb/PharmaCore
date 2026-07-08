using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using KitPlatform.Api.Authorization;
using KitPlatform.Application.Abstractions;
using KitPlatform.Application.Core;
using KitPlatform.Application.CustomerApp;
using KitPlatform.Application.Customers;

namespace KitPlatform.Api.Controllers.CustomerApp;

[ApiController]
[Route("api/customer-app/consents")]
[Authorize(Policy = CustomerAppPolicies.Authenticated)]
[RequirePlatformModule(PlatformModuleCodes.CustomerApp)]
public sealed class CustomerAppConsentController : ControllerBase
{
    private readonly ICustomerAppConsentService _consents;
    private readonly ICurrentCustomerAccessor _customer;

    public CustomerAppConsentController(
        ICustomerAppConsentService consents,
        ICurrentCustomerAccessor customer)
    {
        _consents = consents;
        _customer = customer;
    }

    /// <summary>Đồng ý CDP của khách (SMS/App push cho nhắc chăm sóc, marketing, …).</summary>
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<CustomerConsentDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetConsents(CancellationToken cancellationToken) =>
        Ok(await _consents.GetConsentsAsync(
            _customer.TenantId,
            _customer.CustomerId,
            cancellationToken));

    [HttpPut]
    [ProducesResponseType(typeof(IReadOnlyList<CustomerConsentDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> UpsertConsents(
        [FromBody] UpsertCustomerConsentsRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            return Ok(await _consents.UpsertConsentsAsync(
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

    /// <summary>Có thể gửi nhắc uống thuốc (đã đồng ý SMS hoặc App push — mục đích nhắc chăm sóc).</summary>
    [HttpGet("care-reminder-eligible")]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    public async Task<IActionResult> CareReminderEligible(CancellationToken cancellationToken)
    {
        var eligible = await _consents.CanDispatchCareReminderAsync(
            _customer.TenantId,
            _customer.CustomerId,
            cancellationToken);
        return Ok(new { eligible });
    }
}
