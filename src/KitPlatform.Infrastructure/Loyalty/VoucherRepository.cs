using System.Data;
using Dapper;
using KitPlatform.Infrastructure.Data;

namespace KitPlatform.Infrastructure.Loyalty;

internal sealed class VoucherRepository
{
    private readonly IDbConnectionFactory _db;

    public VoucherRepository(IDbConnectionFactory db) => _db = db;

    public async Task<IReadOnlyList<VoucherRow>> ListAsync(Guid tenantId, CancellationToken cancellationToken)
    {
        await using var conn = await _db.CreateOpenConnectionAsync(cancellationToken);
        var rows = await conn.QueryAsync<VoucherRow>("""
            SELECT
                v.id AS Id,
                v.voucher_code AS VoucherCode,
                v.voucher_name AS VoucherName,
                v.discount_type AS DiscountType,
                v.discount_value AS DiscountValue,
                v.min_order_amount AS MinOrderAmount,
                v.max_uses AS MaxUses,
                v.used_count AS UsedCount,
                v.valid_from AS ValidFrom,
                v.valid_to AS ValidTo,
                v.status AS Status,
                (SELECT COUNT(*)::int FROM customer_vouchers cv WHERE cv.voucher_id = v.id) AS IssuedCount
            FROM vouchers v
            WHERE v.tenant_id = @TenantId
            ORDER BY v.created_at DESC
            """, new { TenantId = tenantId });
        return rows.ToList();
    }

    public async Task<VoucherRow?> GetAsync(Guid tenantId, Guid id, CancellationToken cancellationToken)
    {
        await using var conn = await _db.CreateOpenConnectionAsync(cancellationToken);
        return await conn.QuerySingleOrDefaultAsync<VoucherRow>("""
            SELECT
                v.id AS Id,
                v.voucher_code AS VoucherCode,
                v.voucher_name AS VoucherName,
                v.discount_type AS DiscountType,
                v.discount_value AS DiscountValue,
                v.min_order_amount AS MinOrderAmount,
                v.max_uses AS MaxUses,
                v.used_count AS UsedCount,
                v.valid_from AS ValidFrom,
                v.valid_to AS ValidTo,
                v.status AS Status,
                (SELECT COUNT(*)::int FROM customer_vouchers cv WHERE cv.voucher_id = v.id) AS IssuedCount
            FROM vouchers v
            WHERE v.id = @Id AND v.tenant_id = @TenantId
            """, new { Id = id, TenantId = tenantId });
    }

    public async Task<Guid> CreateAsync(
        Guid tenantId,
        string voucherCode,
        string voucherName,
        short discountType,
        decimal discountValue,
        decimal minOrderAmount,
        int? maxUses,
        DateTime validFrom,
        DateTime validTo,
        short status,
        CancellationToken cancellationToken)
    {
        await using var conn = await _db.CreateOpenConnectionAsync(cancellationToken);
        return await conn.QuerySingleAsync<Guid>("""
            INSERT INTO vouchers (
                tenant_id, voucher_code, voucher_name, discount_type, discount_value,
                min_order_amount, max_uses, valid_from, valid_to, status)
            VALUES (
                @TenantId, @VoucherCode, @VoucherName, @DiscountType, @DiscountValue,
                @MinOrderAmount, @MaxUses, @ValidFrom, @ValidTo, @Status)
            RETURNING id
            """, new
        {
            TenantId = tenantId,
            VoucherCode = voucherCode,
            VoucherName = voucherName,
            DiscountType = discountType,
            DiscountValue = discountValue,
            MinOrderAmount = minOrderAmount,
            MaxUses = maxUses,
            ValidFrom = validFrom,
            ValidTo = validTo,
            Status = status,
        });
    }

    public async Task UpdateAsync(
        Guid tenantId,
        Guid id,
        string voucherCode,
        string voucherName,
        short discountType,
        decimal discountValue,
        decimal minOrderAmount,
        int? maxUses,
        DateTime validFrom,
        DateTime validTo,
        short status,
        CancellationToken cancellationToken)
    {
        await using var conn = await _db.CreateOpenConnectionAsync(cancellationToken);
        var rows = await conn.ExecuteAsync("""
            UPDATE vouchers SET
                voucher_code = @VoucherCode,
                voucher_name = @VoucherName,
                discount_type = @DiscountType,
                discount_value = @DiscountValue,
                min_order_amount = @MinOrderAmount,
                max_uses = @MaxUses,
                valid_from = @ValidFrom,
                valid_to = @ValidTo,
                status = @Status
            WHERE id = @Id AND tenant_id = @TenantId
            """, new
        {
            Id = id,
            TenantId = tenantId,
            VoucherCode = voucherCode,
            VoucherName = voucherName,
            DiscountType = discountType,
            DiscountValue = discountValue,
            MinOrderAmount = minOrderAmount,
            MaxUses = maxUses,
            ValidFrom = validFrom,
            ValidTo = validTo,
            Status = status,
        });
        if (rows == 0)
            throw new InvalidOperationException("Voucher không tồn tại.");
    }

    public async Task<bool> IssueAsync(
        Guid tenantId,
        Guid voucherId,
        Guid customerId,
        CancellationToken cancellationToken)
    {
        await using var conn = await _db.CreateOpenConnectionAsync(cancellationToken);
        var rows = await conn.ExecuteAsync("""
            INSERT INTO customer_vouchers (customer_id, voucher_id)
            SELECT @CustomerId, @VoucherId
            FROM vouchers v
            JOIN customers c ON c.id = @CustomerId AND c.tenant_id = @TenantId
            WHERE v.id = @VoucherId AND v.tenant_id = @TenantId
            ON CONFLICT (customer_id, voucher_id) DO NOTHING
            """, new { TenantId = tenantId, VoucherId = voucherId, CustomerId = customerId });
        return rows > 0;
    }

    public async Task<IReadOnlyList<IssuedCustomerVoucherRow>> ListIssuedAsync(
        Guid tenantId,
        Guid voucherId,
        CancellationToken cancellationToken)
    {
        await using var conn = await _db.CreateOpenConnectionAsync(cancellationToken);
        var rows = await conn.QueryAsync<IssuedCustomerVoucherRow>("""
            SELECT
                cv.id AS CustomerVoucherId,
                cv.customer_id AS CustomerId,
                c.full_name AS CustomerName,
                c.phone AS CustomerPhone,
                cv.issued_at AS IssuedAt,
                cv.used_at AS UsedAt
            FROM customer_vouchers cv
            JOIN customers c ON c.id = cv.customer_id
            JOIN vouchers v ON v.id = cv.voucher_id AND v.tenant_id = @TenantId
            WHERE cv.voucher_id = @VoucherId
            ORDER BY cv.issued_at DESC
            """, new { TenantId = tenantId, VoucherId = voucherId });
        return rows.ToList();
    }

    public async Task<CustomerVoucherDetailRow?> GetCustomerVoucherAsync(
        Guid tenantId,
        Guid customerVoucherId,
        Guid customerId,
        IDbConnection conn,
        IDbTransaction tx,
        CancellationToken cancellationToken)
    {
        return await conn.QuerySingleOrDefaultAsync<CustomerVoucherDetailRow>("""
            SELECT
                cv.id AS CustomerVoucherId,
                cv.customer_id AS CustomerId,
                cv.used_at AS UsedAt,
                v.id AS VoucherId,
                v.voucher_code AS VoucherCode,
                v.voucher_name AS VoucherName,
                v.discount_type AS DiscountType,
                v.discount_value AS DiscountValue,
                v.min_order_amount AS MinOrderAmount,
                v.max_uses AS MaxUses,
                v.used_count AS UsedCount,
                v.valid_from AS ValidFrom,
                v.valid_to AS ValidTo,
                v.status AS Status
            FROM customer_vouchers cv
            INNER JOIN vouchers v ON v.id = cv.voucher_id AND v.tenant_id = @TenantId
            WHERE cv.id = @CustomerVoucherId AND cv.customer_id = @CustomerId
            """, new { TenantId = tenantId, CustomerVoucherId = customerVoucherId, CustomerId = customerId }, tx);
    }

    public async Task<IReadOnlyList<CustomerVoucherDetailRow>> ListCustomerWalletAsync(
        Guid tenantId,
        Guid customerId,
        IDbConnection? conn,
        IDbTransaction? tx,
        CancellationToken cancellationToken)
    {
        const string sql = """
            SELECT
                cv.id AS CustomerVoucherId,
                cv.customer_id AS CustomerId,
                cv.used_at AS UsedAt,
                v.id AS VoucherId,
                v.voucher_code AS VoucherCode,
                v.voucher_name AS VoucherName,
                v.discount_type AS DiscountType,
                v.discount_value AS DiscountValue,
                v.min_order_amount AS MinOrderAmount,
                v.max_uses AS MaxUses,
                v.used_count AS UsedCount,
                v.valid_from AS ValidFrom,
                v.valid_to AS ValidTo,
                v.status AS Status
            FROM customer_vouchers cv
            INNER JOIN vouchers v ON v.id = cv.voucher_id AND v.tenant_id = @TenantId
            WHERE cv.customer_id = @CustomerId
              AND cv.used_at IS NULL
              AND v.status = 1
            ORDER BY cv.issued_at DESC
            """;

        if (conn is not null)
        {
            return (await conn.QueryAsync<CustomerVoucherDetailRow>(
                sql, new { TenantId = tenantId, CustomerId = customerId }, tx)).ToList();
        }

        await using var localConn = await _db.CreateOpenConnectionAsync(cancellationToken);
        return (await localConn.QueryAsync<CustomerVoucherDetailRow>(
            sql, new { TenantId = tenantId, CustomerId = customerId })).ToList();
    }

    public async Task<bool> MarkUsedAsync(
        Guid customerVoucherId,
        Guid voucherId,
        Guid salesOrderId,
        IDbConnection conn,
        IDbTransaction tx)
    {
        var rows = await conn.ExecuteAsync("""
            UPDATE customer_vouchers SET
                used_at = NOW(),
                sales_order_id = @SalesOrderId
            WHERE id = @CustomerVoucherId
              AND voucher_id = @VoucherId
              AND used_at IS NULL
            """, new { CustomerVoucherId = customerVoucherId, VoucherId = voucherId, SalesOrderId = salesOrderId }, tx);
        if (rows == 0)
            return false;

        await conn.ExecuteAsync("""
            UPDATE vouchers SET used_count = used_count + 1
            WHERE id = @VoucherId
            """, new { VoucherId = voucherId }, tx);
        return true;
    }

    public async Task<bool> CodeExistsAsync(
        Guid tenantId,
        string voucherCode,
        Guid? excludeId,
        CancellationToken cancellationToken)
    {
        await using var conn = await _db.CreateOpenConnectionAsync(cancellationToken);
        return await conn.ExecuteScalarAsync<bool>("""
            SELECT EXISTS(
                SELECT 1 FROM vouchers
                WHERE tenant_id = @TenantId
                  AND UPPER(voucher_code) = UPPER(@VoucherCode)
                  AND (@ExcludeId IS NULL OR id <> @ExcludeId)
            )
            """, new { TenantId = tenantId, VoucherCode = voucherCode, ExcludeId = excludeId });
    }

    public async Task<(bool Ok, string? Error)> TryDeleteAsync(
        Guid tenantId,
        Guid id,
        CancellationToken cancellationToken)
    {
        await using var conn = await _db.CreateOpenConnectionAsync(cancellationToken);

        var exists = await conn.ExecuteScalarAsync<bool>("""
            SELECT EXISTS(
                SELECT 1 FROM vouchers WHERE id = @Id AND tenant_id = @TenantId
            )
            """, new { Id = id, TenantId = tenantId });
        if (!exists)
            return (false, "Voucher không tồn tại.");

        var usedCount = await conn.ExecuteScalarAsync<int>("""
            SELECT used_count FROM vouchers WHERE id = @Id AND tenant_id = @TenantId
            """, new { Id = id, TenantId = tenantId });
        if (usedCount > 0)
            return (false, "Không xóa được — voucher đã được sử dụng. Hãy tắt thay vì xóa.");

        var hasUsedIssued = await conn.ExecuteScalarAsync<bool>("""
            SELECT EXISTS(
                SELECT 1 FROM customer_vouchers cv
                WHERE cv.voucher_id = @Id AND cv.used_at IS NOT NULL
            )
            """, new { Id = id });
        if (hasUsedIssued)
            return (false, "Không xóa được — voucher đã được sử dụng. Hãy tắt thay vì xóa.");

        var hasSalesOrder = await conn.ExecuteScalarAsync<bool>("""
            SELECT EXISTS(
                SELECT 1 FROM sales_orders so
                WHERE so.voucher_id = @Id AND so.tenant_id = @TenantId
            )
            """, new { Id = id, TenantId = tenantId });
        if (hasSalesOrder)
            return (false, "Không xóa được — voucher đã gắn với đơn bán.");

        await using var tx = await conn.BeginTransactionAsync(cancellationToken);
        await conn.ExecuteAsync(
            "DELETE FROM customer_vouchers WHERE voucher_id = @Id",
            new { Id = id },
            tx);
        var rows = await conn.ExecuteAsync(
            "DELETE FROM vouchers WHERE id = @Id AND tenant_id = @TenantId",
            new { Id = id, TenantId = tenantId },
            tx);
        await tx.CommitAsync(cancellationToken);
        return rows > 0 ? (true, null) : (false, "Voucher không tồn tại.");
    }

    public async Task<(IReadOnlyList<VoucherIssueCandidateRow> Items, int Total)> SearchIssueCandidatesAsync(
        Guid tenantId,
        Guid voucherId,
        VoucherIssueCandidateSearchParams query,
        CancellationToken cancellationToken)
    {
        await using var conn = await _db.CreateOpenConnectionAsync(cancellationToken);

        var conditions = new List<string>
        {
            "c.tenant_id = @TenantId",
            "c.deleted_at IS NULL",
        };
        var param = new DynamicParameters();
        param.Add("TenantId", tenantId);
        param.Add("VoucherId", voucherId);

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            conditions.Add("(c.full_name ILIKE @Search OR c.phone ILIKE @Search OR c.customer_code ILIKE @Search)");
            param.Add("Search", $"%{query.Search.Trim()}%");
        }

        if (query.ExcludeAlreadyIssued)
        {
            conditions.Add("""
                NOT EXISTS (
                    SELECT 1 FROM customer_vouchers cv
                    WHERE cv.customer_id = c.id AND cv.voucher_id = @VoucherId
                )
                """);
        }

        if (query.RevenueEnabled)
        {
            conditions.Add("""
                EXISTS (
                    SELECT 1
                    FROM sales_orders o
                    WHERE o.tenant_id = @TenantId
                      AND o.customer_id = c.id
                      AND o.status = 2
                      AND o.order_date >= @RevenueFrom
                      AND o.order_date < @RevenueToExclusive
                    GROUP BY o.customer_id
                    HAVING SUM(o.total_amount) >= @MinRevenue
                )
                """);
            param.Add("RevenueFrom", query.RevenueFrom);
            param.Add("RevenueToExclusive", query.RevenueToExclusive);
            param.Add("MinRevenue", query.MinRevenue);
        }

        if (query.BirthdayEnabled)
        {
            conditions.Add("c.date_of_birth IS NOT NULL");
            if (query.BirthdayWrapsYear)
            {
                conditions.Add("""
                    (
                        (EXTRACT(MONTH FROM c.date_of_birth)::int * 100 + EXTRACT(DAY FROM c.date_of_birth)::int) >= @BirthdayFromMmDd
                        OR (EXTRACT(MONTH FROM c.date_of_birth)::int * 100 + EXTRACT(DAY FROM c.date_of_birth)::int) <= @BirthdayToMmDd
                    )
                    """);
            }
            else
            {
                conditions.Add("""
                    (EXTRACT(MONTH FROM c.date_of_birth)::int * 100 + EXTRACT(DAY FROM c.date_of_birth)::int)
                        BETWEEN @BirthdayFromMmDd AND @BirthdayToMmDd
                    """);
            }

            param.Add("BirthdayFromMmDd", query.BirthdayFromMmDd);
            param.Add("BirthdayToMmDd", query.BirthdayToMmDd);
        }

        if (query.TierEnabled && query.TierIds is { Count: > 0 })
        {
            conditions.Add("""
                EXISTS (
                    SELECT 1 FROM customer_loyalty cl
                    WHERE cl.customer_id = c.id AND cl.tier_id = ANY(@TierIds)
                )
                """);
            param.Add("TierIds", query.TierIds.ToArray());
        }

        var whereClause = string.Join(" AND ", conditions);
        var revenueSelect = query.RevenueEnabled
            ? """
              (
                  SELECT COALESCE(SUM(o.total_amount), 0)
                  FROM sales_orders o
                  WHERE o.tenant_id = @TenantId
                    AND o.customer_id = c.id
                    AND o.status = 2
                    AND o.order_date >= @RevenueFrom
                    AND o.order_date < @RevenueToExclusive
              ) AS PeriodRevenue
              """
            : "NULL::numeric AS PeriodRevenue";

        param.Add("PageSize", query.PageSize);
        param.Add("Offset", (query.Page - 1) * query.PageSize);

        var countSql = $"""
            SELECT COUNT(*)::int
            FROM customers c
            WHERE {whereClause}
            """;

        var listSql = $"""
            SELECT
                c.id AS Id,
                c.customer_code AS CustomerCode,
                c.full_name AS FullName,
                c.phone AS Phone,
                lt.tier_name AS TierName,
                {revenueSelect},
                c.date_of_birth AS DateOfBirth,
                EXISTS (
                    SELECT 1 FROM customer_vouchers cv
                    WHERE cv.customer_id = c.id AND cv.voucher_id = @VoucherId
                ) AS AlreadyIssued
            FROM customers c
            LEFT JOIN customer_loyalty cl ON cl.customer_id = c.id
            LEFT JOIN loyalty_tiers lt ON lt.id = cl.tier_id
            WHERE {whereClause}
            ORDER BY c.full_name
            LIMIT @PageSize OFFSET @Offset
            """;

        var total = await conn.ExecuteScalarAsync<int>(countSql, param);
        var items = (await conn.QueryAsync<VoucherIssueCandidateRow>(listSql, param)).ToList();
        return (items, total);
    }

    public async Task<int> IssueBulkAsync(
        Guid tenantId,
        Guid voucherId,
        IReadOnlyList<Guid> customerIds,
        CancellationToken cancellationToken)
    {
        if (customerIds.Count == 0)
            return 0;

        await using var conn = await _db.CreateOpenConnectionAsync(cancellationToken);
        return await conn.ExecuteAsync("""
            INSERT INTO customer_vouchers (customer_id, voucher_id)
            SELECT cid, @VoucherId
            FROM unnest(@CustomerIds::uuid[]) AS cid
            INNER JOIN customers c ON c.id = cid AND c.tenant_id = @TenantId AND c.deleted_at IS NULL
            INNER JOIN vouchers v ON v.id = @VoucherId AND v.tenant_id = @TenantId AND v.status = 1
            ON CONFLICT (customer_id, voucher_id) DO NOTHING
            """, new
        {
            TenantId = tenantId,
            VoucherId = voucherId,
            CustomerIds = customerIds.ToArray(),
        });
    }
}

internal sealed record VoucherIssueCandidateRow
{
    public Guid Id { get; init; }
    public string CustomerCode { get; init; } = "";
    public string FullName { get; init; } = "";
    public string Phone { get; init; } = "";
    public string? TierName { get; init; }
    public decimal? PeriodRevenue { get; init; }
    public DateOnly? DateOfBirth { get; init; }
    public bool AlreadyIssued { get; init; }
}

internal sealed class VoucherIssueCandidateSearchParams
{
    public string? Search { get; init; }
    public bool RevenueEnabled { get; init; }
    public DateTime? RevenueFrom { get; init; }
    public DateTime? RevenueToExclusive { get; init; }
    public decimal MinRevenue { get; init; }
    public bool BirthdayEnabled { get; init; }
    public int BirthdayFromMmDd { get; init; }
    public int BirthdayToMmDd { get; init; }
    public bool BirthdayWrapsYear { get; init; }
    public bool TierEnabled { get; init; }
    public IReadOnlyList<Guid>? TierIds { get; init; }
    public bool ExcludeAlreadyIssued { get; init; }
    public int Page { get; init; }
    public int PageSize { get; init; }
}

internal sealed record VoucherRow
{
    public Guid Id { get; init; }
    public string VoucherCode { get; init; } = "";
    public string VoucherName { get; init; } = "";
    public short DiscountType { get; init; }
    public decimal DiscountValue { get; init; }
    public decimal MinOrderAmount { get; init; }
    public int? MaxUses { get; init; }
    public int UsedCount { get; init; }
    public DateTime ValidFrom { get; init; }
    public DateTime ValidTo { get; init; }
    public short Status { get; init; }
    public int IssuedCount { get; init; }
}

internal sealed record IssuedCustomerVoucherRow
{
    public Guid CustomerVoucherId { get; init; }
    public Guid CustomerId { get; init; }
    public string CustomerName { get; init; } = "";
    public string? CustomerPhone { get; init; }
    public DateTime IssuedAt { get; init; }
    public DateTime? UsedAt { get; init; }
}

internal sealed record CustomerVoucherDetailRow
{
    public Guid CustomerVoucherId { get; init; }
    public Guid CustomerId { get; init; }
    public DateTime? UsedAt { get; init; }
    public Guid VoucherId { get; init; }
    public string VoucherCode { get; init; } = "";
    public string VoucherName { get; init; } = "";
    public short DiscountType { get; init; }
    public decimal DiscountValue { get; init; }
    public decimal MinOrderAmount { get; init; }
    public int? MaxUses { get; init; }
    public int UsedCount { get; init; }
    public DateTime ValidFrom { get; init; }
    public DateTime ValidTo { get; init; }
    public short Status { get; init; }
}
