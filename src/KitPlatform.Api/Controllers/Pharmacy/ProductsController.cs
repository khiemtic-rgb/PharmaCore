using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using KitPlatform.Api.Authorization;
using KitPlatform.Packs.Pharmacy.Catalog;
using KitPlatform.Packs.Pharmacy.Infrastructure;

namespace KitPlatform.Api.Controllers.Pharmacy;

[ApiController]
[Authorize]
[Route("api/catalog/products")]
public sealed class ProductsController : ControllerBase
{
    private readonly ICatalogService _catalog;
    private readonly INationalDrugBulkLinkService _nationalBulkLink;

    public ProductsController(ICatalogService catalog, INationalDrugBulkLinkService nationalBulkLink)
    {
        _catalog = catalog;
        _nationalBulkLink = nationalBulkLink;
    }

    [HttpGet]
    [Authorize(Policy = CatalogPolicies.Read)]
    public async Task<ActionResult<PagedProductListResult>> List(
        [FromQuery] string? search = null,
        [FromQuery] short[]? drugTypes = null,
        [FromQuery] Guid[]? categoryIds = null,
        [FromQuery] Guid[]? brandIds = null,
        [FromQuery] short? status = null,
        [FromQuery] decimal? priceMin = null,
        [FromQuery] decimal? priceMax = null,
        [FromQuery] bool? hasBarcode = null,
        [FromQuery] bool? hasPrice = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        var filter = new ProductListFilter(
            search, drugTypes, categoryIds, brandIds, status,
            priceMin, priceMax, hasBarcode, hasPrice, page, pageSize);
        var result = await _catalog.GetProductsAsync(filter, cancellationToken);
        return Ok(new PagedProductListResult(result.Items, result.Total, result.Page, result.PageSize));
    }

    [HttpGet("check-name")]
    [Authorize(Policy = CatalogPolicies.Read)]
    public async Task<ActionResult<SimilarProductNamesResult>> CheckName(
        [FromQuery] string name,
        [FromQuery] Guid? excludeId,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(name))
            return Ok(new SimilarProductNamesResult([], false));

        var result = await _catalog.FindSimilarProductNamesAsync(name, excludeId, 0.95, cancellationToken);
        return Ok(result);
    }

    [HttpGet("next-code")]
    [Authorize(Policy = CatalogPolicies.Read)]
    public async Task<ActionResult<NextProductCodeDto>> NextCode(CancellationToken cancellationToken)
    {
        var code = await _catalog.GetNextProductCodeAsync(cancellationToken);
        return Ok(new NextProductCodeDto(code));
    }

    [HttpGet("{id:guid}")]
    [Authorize(Policy = CatalogPolicies.Read)]
    public async Task<ActionResult<ProductDetailDto>> Get(Guid id, CancellationToken cancellationToken)
    {
        var product = await _catalog.GetProductAsync(id, cancellationToken);
        return product is null ? NotFound() : Ok(product);
    }

    [HttpPost("bulk-delete")]
    [Authorize(Policy = CatalogPolicies.Write)]
    public async Task<ActionResult<BulkDeleteResult>> BulkDelete(
        [FromBody] BulkDeleteProductsRequest request,
        CancellationToken cancellationToken)
    {
        if (request.Ids.Count == 0)
            return BadRequest(new { message = "Chọn ít nhất một sản phẩm." });

        var deleted = await _catalog.BulkDeleteProductsAsync(request.Ids, cancellationToken);
        return Ok(new BulkDeleteResult(deleted));
    }

    [HttpPost("bulk-suggest-national-registration")]
    [Authorize(Policy = CatalogPolicies.Write)]
    public async Task<ActionResult<BulkNationalLinkResult>> BulkSuggestNationalRegistration(
        [FromQuery] int limit = 50,
        CancellationToken cancellationToken = default) =>
        Ok(await _nationalBulkLink.ApplySuggestionsAsync(limit, cancellationToken));

    [HttpPost]
    [Authorize(Policy = CatalogPolicies.Write)]
    public async Task<ActionResult<ProductDetailDto>> Create(
        [FromBody] CreateProductRequest request,
        CancellationToken cancellationToken)
    {
        var product = await _catalog.CreateProductAsync(request, cancellationToken);
        return CreatedAtAction(nameof(Get), new { id = product.Id }, product);
    }

    [HttpPut("{id:guid}/commercial")]
    [Authorize(Policy = CatalogPolicies.Write)]
    public async Task<ActionResult<ProductDetailDto>> SyncCommercial(
        Guid id,
        [FromBody] SyncProductCommercialRequest request,
        CancellationToken cancellationToken)
    {
        var product = await _catalog.SyncProductCommercialAsync(id, request, cancellationToken);
        return product is null ? NotFound() : Ok(product);
    }

    [HttpPost("{id:guid}/commercial")]
    [Authorize(Policy = CatalogPolicies.Write)]
    public async Task<ActionResult<ProductDetailDto>> SyncCommercialPost(
        Guid id,
        [FromBody] SyncProductCommercialRequest request,
        CancellationToken cancellationToken)
    {
        var product = await _catalog.SyncProductCommercialAsync(id, request, cancellationToken);
        return product is null ? NotFound() : Ok(product);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = CatalogPolicies.Write)]
    public async Task<ActionResult<ProductDetailDto>> Update(
        Guid id,
        [FromBody] UpdateProductRequest request,
        CancellationToken cancellationToken)
    {
        var product = await _catalog.UpdateProductAsync(id, request, cancellationToken);
        return product is null ? NotFound() : Ok(product);
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Policy = CatalogPolicies.Write)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var deleted = await _catalog.DeleteProductAsync(id, cancellationToken);
        return deleted ? NoContent() : NotFound();
    }

    [HttpPost("{id:guid}/barcodes")]
    [Authorize(Policy = CatalogPolicies.Write)]
    public async Task<ActionResult<ProductBarcodeDto>> AddBarcode(
        Guid id,
        [FromBody] CreateBarcodeRequest request,
        CancellationToken cancellationToken)
    {
        var barcode = await _catalog.AddBarcodeAsync(id, request, cancellationToken);
        return barcode is null ? NotFound() : Ok(barcode);
    }

    [HttpPost("{id:guid}/prices")]
    [Authorize(Policy = CatalogPolicies.Write)]
    public async Task<ActionResult<ProductPriceDto>> AddPrice(
        Guid id,
        [FromBody] CreatePriceRequest request,
        CancellationToken cancellationToken)
    {
        var price = await _catalog.AddPriceAsync(id, request, cancellationToken);
        return price is null ? NotFound() : Ok(price);
    }

    [HttpPut("{id:guid}/units")]
    [Authorize(Policy = CatalogPolicies.Write)]
    public async Task<ActionResult<ProductDetailDto>> SyncUnits(
        Guid id,
        [FromBody] SyncProductUnitsRequest request,
        CancellationToken cancellationToken)
    {
        var product = await _catalog.SyncProductUnitsAsync(id, request, cancellationToken);
        return product is null ? NotFound() : Ok(product);
    }

    [HttpPost("{id:guid}/units")]
    [Authorize(Policy = CatalogPolicies.Write)]
    public async Task<ActionResult<ProductDetailDto>> SyncUnitsPost(
        Guid id,
        [FromBody] SyncProductUnitsRequest request,
        CancellationToken cancellationToken)
    {
        var product = await _catalog.SyncProductUnitsAsync(id, request, cancellationToken);
        return product is null ? NotFound() : Ok(product);
    }

    [HttpPut("{id:guid}/ingredients")]
    [Authorize(Policy = CatalogPolicies.Write)]
    public async Task<ActionResult<ProductDetailDto>> SyncIngredients(
        Guid id,
        [FromBody] SyncProductIngredientsRequest request,
        CancellationToken cancellationToken)
    {
        var product = await _catalog.SyncProductIngredientsAsync(id, request, cancellationToken);
        return product is null ? NotFound() : Ok(product);
    }

    [HttpPost("{id:guid}/ingredients")]
    [Authorize(Policy = CatalogPolicies.Write)]
    public async Task<ActionResult<ProductDetailDto>> SyncIngredientsPost(
        Guid id,
        [FromBody] SyncProductIngredientsRequest request,
        CancellationToken cancellationToken)
    {
        var product = await _catalog.SyncProductIngredientsAsync(id, request, cancellationToken);
        return product is null ? NotFound() : Ok(product);
    }

    [HttpGet("dispensing-class/summary")]
    [Authorize(Policy = CatalogPolicies.Read)]
    public async Task<ActionResult<DispensingClassSummaryDto>> DispensingClassSummary(
        CancellationToken cancellationToken) =>
        Ok(await _catalog.GetDispensingClassSummaryAsync(cancellationToken));

    [HttpPost("dispensing-class/sync-from-drug-type")]
    [Authorize(Policy = CatalogPolicies.Write)]
    public async Task<ActionResult<SyncDispensingClassResultDto>> SyncDispensingClass(
        CancellationToken cancellationToken) =>
        Ok(await _catalog.SyncDispensingClassFromDrugTypeAsync(cancellationToken));
}
