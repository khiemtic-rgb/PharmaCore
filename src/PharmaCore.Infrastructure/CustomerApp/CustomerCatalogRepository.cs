using Dapper;
using PharmaCore.Application.CustomerApp;
using PharmaCore.Infrastructure.Data;

namespace PharmaCore.Infrastructure.CustomerApp;

internal sealed class CustomerCatalogRepository
{
    private readonly IDbConnectionFactory _db;

    public CustomerCatalogRepository(IDbConnectionFactory db) => _db = db;

    public async Task<(IReadOnlyList<CustomerProductSearchItemDto> Items, int Total)> SearchProductsAsync(
        Guid tenantId,
        string? search,
        int page,
        int pageSize,
        CancellationToken cancellationToken)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 50);
        var offset = (page - 1) * pageSize;

        const string where = """
            WHERE p.tenant_id = @TenantId
              AND p.deleted_at IS NULL
              AND p.status = 1
              AND (
                  @Search IS NULL
                  OR p.product_name ILIKE @SearchPattern
                  OR p.product_code ILIKE @SearchPattern
                  OR p.generic_name ILIKE @SearchPattern
                  OR EXISTS (
                      SELECT 1 FROM product_barcodes b
                      WHERE b.product_id = p.id AND b.status = 1 AND b.barcode ILIKE @SearchPattern
                  )
              )
            """;

        var sql = $"""
            SELECT COUNT(*)::int FROM products p {where};
            SELECT
                p.id AS Id,
                p.product_code AS ProductCode,
                p.product_name AS ProductName,
                p.generic_name AS GenericName,
                (SELECT u.unit_name FROM product_units u
                 WHERE u.product_id = p.id AND u.is_sale_unit = TRUE
                 ORDER BY u.is_base_unit DESC, u.unit_name LIMIT 1) AS SaleUnitName
            FROM products p
            {where}
            ORDER BY p.product_name
            LIMIT @PageSize OFFSET @Offset
            """;

        await using var conn = await _db.CreateOpenConnectionAsync(cancellationToken);
        using var multi = await conn.QueryMultipleAsync(sql, new
        {
            TenantId = tenantId,
            Search = string.IsNullOrWhiteSpace(search) ? null : search.Trim(),
            SearchPattern = string.IsNullOrWhiteSpace(search) ? null : $"%{search.Trim()}%",
            PageSize = pageSize,
            Offset = offset,
        });

        var total = await multi.ReadSingleAsync<int>();
        var items = (await multi.ReadAsync<CustomerProductSearchItemDto>()).ToList();
        return (items, total);
    }

    public async Task<CustomerProductSearchItemDto?> GetByIdAsync(
        Guid tenantId,
        Guid productId,
        CancellationToken cancellationToken)
    {
        const string sql = """
            SELECT
                p.id AS Id,
                p.product_code AS ProductCode,
                p.product_name AS ProductName,
                p.generic_name AS GenericName,
                (SELECT u.unit_name FROM product_units u
                 WHERE u.product_id = p.id AND u.is_sale_unit = TRUE
                 ORDER BY u.is_base_unit DESC, u.unit_name LIMIT 1) AS SaleUnitName
            FROM products p
            WHERE p.id = @ProductId
              AND p.tenant_id = @TenantId
              AND p.deleted_at IS NULL
            """;

        await using var conn = await _db.CreateOpenConnectionAsync(cancellationToken);
        return await conn.QuerySingleOrDefaultAsync<CustomerProductSearchItemDto>(sql, new
        {
            ProductId = productId,
            TenantId = tenantId,
        });
    }
}
