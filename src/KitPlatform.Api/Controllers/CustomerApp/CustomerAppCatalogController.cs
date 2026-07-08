using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using KitPlatform.Api.Authorization;
using KitPlatform.Application.Abstractions;
using KitPlatform.Application.Core;
using KitPlatform.Application.CustomerApp;

namespace KitPlatform.Api.Controllers.CustomerApp;

[ApiController]
[Route("api/customer-app/catalog")]
[Authorize(Policy = CustomerAppPolicies.Authenticated)]
[RequirePlatformModule(PlatformModuleCodes.CustomerApp)]
public sealed class CustomerAppCatalogController : ControllerBase
{
    private readonly ICustomerCatalogService _catalog;
    private readonly ICurrentCustomerAccessor _customer;

    public CustomerAppCatalogController(
        ICustomerCatalogService catalog,
        ICurrentCustomerAccessor customer)
    {
        _catalog = catalog;
        _customer = customer;
    }

    /// <summary>Tra cứu sản phẩm đang bán — dùng cho chọn thuốc khi tạo nhắc uống.</summary>
    [HttpGet("products")]
    [ProducesResponseType(typeof(CustomerProductSearchResult), StatusCodes.Status200OK)]
    public async Task<IActionResult> SearchProducts(
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default) =>
        Ok(await _catalog.SearchProductsAsync(
            _customer.TenantId,
            search,
            page,
            pageSize,
            cancellationToken));
}
