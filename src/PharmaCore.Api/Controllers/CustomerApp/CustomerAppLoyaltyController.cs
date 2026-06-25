using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PharmaCore.Api.Authorization;
using PharmaCore.Application.Abstractions;
using PharmaCore.Application.CustomerApp;

namespace PharmaCore.Api.Controllers.CustomerApp;

[ApiController]
[Route("api/customer-app/loyalty")]
[Authorize(Policy = CustomerAppPolicies.Authenticated)]
public sealed class CustomerAppLoyaltyController : ControllerBase
{
    private readonly ICustomerLoyaltyService _loyalty;
    private readonly ICurrentCustomerAccessor _customer;

    public CustomerAppLoyaltyController(
        ICustomerLoyaltyService loyalty,
        ICurrentCustomerAccessor customer)
    {
        _loyalty = loyalty;
        _customer = customer;
    }

    /// <summary>Số dư điểm và hạng theo từng chương trình loyalty của tenant.</summary>
    [HttpGet("summary")]
    [ProducesResponseType(typeof(CustomerLoyaltySummaryDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Summary(CancellationToken cancellationToken)
    {
        var summary = await _loyalty.GetSummaryAsync(
            _customer.TenantId,
            _customer.CustomerId,
            cancellationToken);

        return summary is null
            ? NotFound(new { message = "Chưa tham gia chương trình tích điểm." })
            : Ok(summary);
    }

    /// <summary>Lịch sử giao dịch điểm (earn/redeem/expire/adjust).</summary>
    [HttpGet("transactions")]
    [ProducesResponseType(typeof(PagedLoyaltyTransactionsResult), StatusCodes.Status200OK)]
    public async Task<IActionResult> Transactions(
        [FromQuery] Guid? programId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default) =>
        Ok(await _loyalty.GetTransactionsAsync(
            _customer.TenantId,
            _customer.CustomerId,
            programId,
            page,
            pageSize,
            cancellationToken));

    /// <summary>Danh sách chương trình tích điểm đang hoạt động + quy tắc/hạng.</summary>
    [HttpGet("programs")]
    [ProducesResponseType(typeof(LoyaltyProgramCatalogResult), StatusCodes.Status200OK)]
    public async Task<IActionResult> Programs(CancellationToken cancellationToken) =>
        Ok(await _loyalty.GetProgramsAsync(
            _customer.TenantId,
            _customer.CustomerId,
            cancellationToken));

    /// <summary>Voucher trong ví khách (mặc định chỉ voucher chưa dùng).</summary>
    [HttpGet("vouchers")]
    [ProducesResponseType(typeof(CustomerVoucherListResult), StatusCodes.Status200OK)]
    public async Task<IActionResult> Vouchers(
        [FromQuery] bool includeUsed = false,
        CancellationToken cancellationToken = default) =>
        Ok(await _loyalty.GetVouchersAsync(
            _customer.TenantId,
            _customer.CustomerId,
            includeUsed,
            cancellationToken));
}
