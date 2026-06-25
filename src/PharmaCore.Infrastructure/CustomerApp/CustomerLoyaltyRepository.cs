using Dapper;
using PharmaCore.Infrastructure.Data;

namespace PharmaCore.Infrastructure.CustomerApp;

internal sealed class CustomerLoyaltyRepository
{
    private readonly IDbConnectionFactory _db;

    public CustomerLoyaltyRepository(IDbConnectionFactory db) => _db = db;

    public async Task<IReadOnlyList<LoyaltyEnrollmentRow>> GetEnrollmentsAsync(
        Guid tenantId,
        Guid customerId,
        CancellationToken cancellationToken)
    {
        const string sql = """
            SELECT
                lp.id AS ProgramId,
                lp.program_code AS ProgramCode,
                lp.program_name AS ProgramName,
                cl.points_balance AS PointsBalance,
                cl.lifetime_points AS LifetimePoints,
                lt.tier_code AS TierCode,
                lt.tier_name AS TierName,
                lt.min_points AS TierMinPoints,
                lt.discount_percent AS TierDiscountPercent
            FROM customer_loyalty cl
            INNER JOIN loyalty_programs lp
                ON lp.id = cl.program_id
               AND lp.tenant_id = @TenantId
               AND lp.status = 1
            LEFT JOIN loyalty_tiers lt ON lt.id = cl.tier_id
            WHERE cl.customer_id = @CustomerId
            ORDER BY lp.program_name
            """;

        await using var conn = await _db.CreateOpenConnectionAsync(cancellationToken);
        var rows = await conn.QueryAsync<LoyaltyEnrollmentRow>(sql, new { TenantId = tenantId, CustomerId = customerId });
        return rows.AsList();
    }

    public async Task<LoyaltyTierRow?> GetNextTierAsync(
        Guid programId,
        int currentTierMinPoints,
        CancellationToken cancellationToken)
    {
        const string sql = """
            SELECT
                tier_code AS TierCode,
                tier_name AS TierName,
                min_points AS MinPoints,
                discount_percent AS DiscountPercent
            FROM loyalty_tiers
            WHERE program_id = @ProgramId
              AND min_points > @CurrentTierMinPoints
            ORDER BY min_points ASC
            LIMIT 1
            """;

        await using var conn = await _db.CreateOpenConnectionAsync(cancellationToken);
        return await conn.QuerySingleOrDefaultAsync<LoyaltyTierRow>(
            sql,
            new { ProgramId = programId, CurrentTierMinPoints = currentTierMinPoints });
    }

    public async Task<(IReadOnlyList<LoyaltyTransactionRow> Items, int Total)> GetTransactionsAsync(
        Guid tenantId,
        Guid customerId,
        Guid? programId,
        int page,
        int pageSize,
        CancellationToken cancellationToken)
    {
        const string countSql = """
            SELECT COUNT(*)::int
            FROM loyalty_transactions lt
            INNER JOIN loyalty_programs lp ON lp.id = lt.program_id AND lp.tenant_id = @TenantId
            WHERE lt.customer_id = @CustomerId
              AND lt.tenant_id = @TenantId
              AND (@ProgramId IS NULL OR lt.program_id = @ProgramId)
            """;

        const string listSql = """
            SELECT
                lt.id AS Id,
                lt.program_id AS ProgramId,
                lp.program_code AS ProgramCode,
                lt.transaction_type AS TransactionType,
                lt.points AS Points,
                lt.sales_order_id AS SalesOrderId,
                lt.notes AS Notes,
                lt.created_at AS CreatedAt
            FROM loyalty_transactions lt
            INNER JOIN loyalty_programs lp ON lp.id = lt.program_id AND lp.tenant_id = @TenantId
            WHERE lt.customer_id = @CustomerId
              AND lt.tenant_id = @TenantId
              AND (@ProgramId IS NULL OR lt.program_id = @ProgramId)
            ORDER BY lt.created_at DESC
            LIMIT @PageSize OFFSET @Offset
            """;

        var offset = (page - 1) * pageSize;
        var args = new
        {
            TenantId = tenantId,
            CustomerId = customerId,
            ProgramId = programId,
            PageSize = pageSize,
            Offset = offset,
        };

        await using var conn = await _db.CreateOpenConnectionAsync(cancellationToken);
        var total = await conn.ExecuteScalarAsync<int>(countSql, args);
        var items = await conn.QueryAsync<LoyaltyTransactionRow>(listSql, args);
        return (items.AsList(), total);
    }

    public async Task<IReadOnlyList<LoyaltyProgramCatalogRow>> GetProgramCatalogAsync(
        Guid tenantId,
        Guid customerId,
        CancellationToken cancellationToken)
    {
        const string sql = """
            SELECT
                lp.id AS ProgramId,
                lp.program_code AS ProgramCode,
                lp.program_name AS ProgramName,
                lp.points_per_amount AS PointsPerAmount,
                lp.amount_per_point AS AmountPerPoint,
                cl.points_balance AS PointsBalance,
                cl.lifetime_points AS LifetimePoints
            FROM loyalty_programs lp
            LEFT JOIN customer_loyalty cl
                ON cl.program_id = lp.id
               AND cl.customer_id = @CustomerId
            WHERE lp.tenant_id = @TenantId
              AND lp.status = 1
            ORDER BY lp.program_name
            """;

        await using var conn = await _db.CreateOpenConnectionAsync(cancellationToken);
        var rows = await conn.QueryAsync<LoyaltyProgramCatalogRow>(sql, new { TenantId = tenantId, CustomerId = customerId });
        return rows.AsList();
    }

    public async Task<IReadOnlyList<LoyaltyTierRow>> GetTiersForProgramAsync(
        Guid programId,
        CancellationToken cancellationToken)
    {
        const string sql = """
            SELECT
                tier_code AS TierCode,
                tier_name AS TierName,
                min_points AS MinPoints,
                discount_percent AS DiscountPercent
            FROM loyalty_tiers
            WHERE program_id = @ProgramId
            ORDER BY sort_order, min_points
            """;

        await using var conn = await _db.CreateOpenConnectionAsync(cancellationToken);
        var rows = await conn.QueryAsync<LoyaltyTierRow>(sql, new { ProgramId = programId });
        return rows.AsList();
    }

    public async Task<IReadOnlyList<CustomerVoucherRow>> GetCustomerVouchersAsync(
        Guid tenantId,
        Guid customerId,
        bool includeUsed,
        CancellationToken cancellationToken)
    {
        const string sql = """
            SELECT
                cv.id AS CustomerVoucherId,
                v.id AS VoucherId,
                v.voucher_code AS VoucherCode,
                v.voucher_name AS VoucherName,
                v.discount_type AS DiscountType,
                v.discount_value AS DiscountValue,
                v.min_order_amount AS MinOrderAmount,
                v.valid_from AS ValidFrom,
                v.valid_to AS ValidTo,
                cv.issued_at AS IssuedAt,
                cv.used_at AS UsedAt
            FROM customer_vouchers cv
            INNER JOIN vouchers v ON v.id = cv.voucher_id AND v.tenant_id = @TenantId
            WHERE cv.customer_id = @CustomerId
              AND v.status = 1
              AND (@IncludeUsed = TRUE OR cv.used_at IS NULL)
            ORDER BY cv.issued_at DESC
            """;

        await using var conn = await _db.CreateOpenConnectionAsync(cancellationToken);
        var rows = await conn.QueryAsync<CustomerVoucherRow>(
            sql,
            new { TenantId = tenantId, CustomerId = customerId, IncludeUsed = includeUsed });
        return rows.AsList();
    }
}

internal sealed record LoyaltyEnrollmentRow(
    Guid ProgramId,
    string ProgramCode,
    string ProgramName,
    decimal PointsBalance,
    decimal LifetimePoints,
    string? TierCode,
    string? TierName,
    int? TierMinPoints,
    decimal? TierDiscountPercent);

internal sealed record LoyaltyTierRow(
    string TierCode,
    string TierName,
    int MinPoints,
    decimal DiscountPercent);

internal sealed record LoyaltyTransactionRow(
    Guid Id,
    Guid ProgramId,
    string ProgramCode,
    short TransactionType,
    decimal Points,
    Guid? SalesOrderId,
    string? Notes,
    DateTime CreatedAt);

internal sealed record LoyaltyProgramCatalogRow(
    Guid ProgramId,
    string ProgramCode,
    string ProgramName,
    decimal PointsPerAmount,
    decimal AmountPerPoint,
    decimal? PointsBalance,
    decimal? LifetimePoints);

internal sealed record CustomerVoucherRow(
    Guid CustomerVoucherId,
    Guid VoucherId,
    string VoucherCode,
    string VoucherName,
    short DiscountType,
    decimal DiscountValue,
    decimal MinOrderAmount,
    DateTime ValidFrom,
    DateTime ValidTo,
    DateTime IssuedAt,
    DateTime? UsedAt);
