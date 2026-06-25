using System.Data;
using Dapper;
using PharmaCore.Application.CustomerApp;
using PharmaCore.Application.Sales;
using PharmaCore.Infrastructure.Data;

namespace PharmaCore.Infrastructure.Loyalty;

internal sealed record LoyaltyRedeemResolution(
    decimal PointsRedeemed,
    decimal DiscountAmount,
    decimal FinalTotal);

internal sealed class LoyaltyPosService
{
    public async Task<PosCustomerLoyaltyDto?> GetPosCustomerLoyaltyAsync(
        Guid tenantId,
        Guid customerId,
        decimal orderTotalBeforeRedeem,
        CancellationToken cancellationToken)
    {
        await using var conn = await _db.CreateOpenConnectionAsync(cancellationToken);
        return await GetPosCustomerLoyaltyAsync(tenantId, customerId, orderTotalBeforeRedeem, conn, null, cancellationToken);
    }

    public async Task<PosCustomerLoyaltyDto?> GetPosCustomerLoyaltyAsync(
        Guid tenantId,
        Guid customerId,
        decimal orderTotalBeforeRedeem,
        IDbConnection conn,
        IDbTransaction? tx,
        CancellationToken cancellationToken)
    {
        var loyaltyEnabled = await conn.ExecuteScalarAsync<bool>(
            """
            SELECT COALESCE((settings->>'loyalty_enabled')::boolean, false)
            FROM tenants
            WHERE id = @TenantId
            """,
            new { TenantId = tenantId },
            tx);

        if (!loyaltyEnabled)
            return null;

        var program = await conn.QuerySingleOrDefaultAsync<LoyaltyProgramRow>(
            """
            SELECT
                id AS Id,
                program_code AS ProgramCode,
                program_name AS ProgramName,
                points_per_amount AS PointsPerAmount,
                amount_per_point AS AmountPerPoint,
                max_redeem_percent AS MaxRedeemPercent,
                status AS Status
            FROM loyalty_programs
            WHERE tenant_id = @TenantId
            ORDER BY created_at
            LIMIT 1
            """,
            new { TenantId = tenantId },
            tx);

        if (program is null || program.AmountPerPoint <= 0)
            return null;

        var pointsBalance = await conn.ExecuteScalarAsync<decimal?>(
            """
            SELECT points_balance
            FROM customer_loyalty
            WHERE customer_id = @CustomerId AND program_id = @ProgramId
            """,
            new { CustomerId = customerId, ProgramId = program.Id },
            tx) ?? 0m;

        var (maxRedeemPoints, maxRedeemDiscount) = ComputeRedeemLimits(
            pointsBalance,
            orderTotalBeforeRedeem,
            program.AmountPerPoint,
            program.MaxRedeemPercent);

        return new PosCustomerLoyaltyDto(
            true,
            pointsBalance,
            program.AmountPerPoint,
            program.PointsPerAmount,
            program.MaxRedeemPercent,
            maxRedeemDiscount,
            maxRedeemPoints);
    }

    public async Task<LoyaltyRedeemResolution> ResolveRedeemAsync(
        Guid tenantId,
        Guid? customerId,
        int? pointsToRedeem,
        decimal? loyaltyDiscountAmount,
        decimal orderTotalBeforeRedeem,
        IDbConnection conn,
        IDbTransaction tx,
        CancellationToken cancellationToken)
    {
        if (customerId is not Guid customer)
            return new LoyaltyRedeemResolution(0, 0, orderTotalBeforeRedeem);

        if (orderTotalBeforeRedeem <= 0)
            throw new InvalidOperationException("Đơn hàng không còn số tiền để đổi điểm.");

        if (loyaltyDiscountAmount is decimal requestedAmount && requestedAmount > 0)
        {
            return await ResolveRedeemByAmountAsync(
                tenantId, customer, requestedAmount, orderTotalBeforeRedeem, conn, tx, cancellationToken);
        }

        if (pointsToRedeem is int requestedPoints && requestedPoints > 0)
        {
            return await ResolveRedeemByPointsAsync(
                tenantId, customer, requestedPoints, orderTotalBeforeRedeem, conn, tx, cancellationToken);
        }

        return new LoyaltyRedeemResolution(0, 0, orderTotalBeforeRedeem);
    }

    private async Task<LoyaltyRedeemResolution> ResolveRedeemByAmountAsync(
        Guid tenantId,
        Guid customerId,
        decimal requestedAmount,
        decimal orderTotalBeforeRedeem,
        IDbConnection conn,
        IDbTransaction tx,
        CancellationToken cancellationToken)
    {
        var preview = await GetPosCustomerLoyaltyAsync(
            tenantId, customerId, orderTotalBeforeRedeem, conn, tx, cancellationToken)
            ?? throw new InvalidOperationException("Chương trình tích điểm chưa được cấu hình.");

        var amount = Math.Round(requestedAmount, 0, MidpointRounding.AwayFromZero);
        var maxByBalance = preview.PointsBalance * preview.AmountPerPoint;
        var maxAllowed = Math.Min(
            Math.Min(preview.MaxRedeemDiscountAmount, maxByBalance),
            orderTotalBeforeRedeem);

        if (amount > maxAllowed + 0.009m)
        {
            var capHint = preview.MaxRedeemPercent < 100
                ? $" (giới hạn {preview.MaxRedeemPercent:N0}% đơn)"
                : string.Empty;
            throw new InvalidOperationException($"Tối đa giảm {maxAllowed:N0} đ bằng điểm trên đơn này{capHint}.");
        }

        if (amount <= 0 || preview.AmountPerPoint <= 0)
            return new LoyaltyRedeemResolution(0, 0, orderTotalBeforeRedeem);

        var pointsUsed = Math.Round(amount / preview.AmountPerPoint, 4, MidpointRounding.AwayFromZero);
        if (pointsUsed > preview.PointsBalance + 0.0001m)
            throw new InvalidOperationException($"Khách chỉ còn {preview.PointsBalance:N4} điểm.");

        if (pointsUsed <= 0)
            return new LoyaltyRedeemResolution(0, 0, orderTotalBeforeRedeem);

        return new LoyaltyRedeemResolution(
            pointsUsed,
            amount,
            orderTotalBeforeRedeem - amount);
    }

    private async Task<LoyaltyRedeemResolution> ResolveRedeemByPointsAsync(
        Guid tenantId,
        Guid customerId,
        int requested,
        decimal orderTotalBeforeRedeem,
        IDbConnection conn,
        IDbTransaction tx,
        CancellationToken cancellationToken)
    {
        var preview = await GetPosCustomerLoyaltyAsync(
            tenantId, customerId, orderTotalBeforeRedeem, conn, tx, cancellationToken)
            ?? throw new InvalidOperationException("Chương trình tích điểm chưa được cấu hình.");

        if (requested > preview.PointsBalance)
            throw new InvalidOperationException($"Khách chỉ còn {preview.PointsBalance:N4} điểm.");

        if (requested > preview.MaxRedeemPoints)
        {
            var capHint = preview.MaxRedeemPercent < 100
                ? $" (giới hạn {preview.MaxRedeemPercent:N0}% đơn, tối đa {preview.MaxRedeemDiscountAmount:N0} đ)"
                : string.Empty;
            throw new InvalidOperationException(
                preview.MaxRedeemPoints <= 0
                    ? $"Không đủ điểm để đổi cho đơn này{capHint}."
                    : $"Tối đa đổi {preview.MaxRedeemPoints:N0} điểm cho đơn này{capHint}.");
        }

        var discount = requested * preview.AmountPerPoint;
        if (discount > preview.MaxRedeemDiscountAmount && preview.MaxRedeemDiscountAmount > 0)
        {
            requested = preview.MaxRedeemPoints;
            discount = requested * preview.AmountPerPoint;
        }

        if (discount > orderTotalBeforeRedeem)
        {
            requested = preview.MaxRedeemPoints;
            discount = requested * preview.AmountPerPoint;
        }

        if (requested <= 0 || discount <= 0)
            return new LoyaltyRedeemResolution(0, 0, orderTotalBeforeRedeem);

        return new LoyaltyRedeemResolution(
            requested,
            discount,
            orderTotalBeforeRedeem - discount);
    }

    public async Task TryRedeemForCompletedSaleAsync(
        Guid tenantId,
        Guid customerId,
        Guid programId,
        Guid orderId,
        string orderNumber,
        decimal pointsRedeemed,
        IDbConnection conn,
        IDbTransaction tx,
        CancellationToken cancellationToken)
    {
        if (pointsRedeemed <= 0)
            return;

        var alreadyRedeemed = await conn.ExecuteScalarAsync<bool>(
            """
            SELECT EXISTS(
                SELECT 1 FROM loyalty_transactions
                WHERE tenant_id = @TenantId
                  AND sales_order_id = @OrderId
                  AND transaction_type = @RedeemType
            )
            """,
            new
            {
                TenantId = tenantId,
                OrderId = orderId,
                RedeemType = (short)LoyaltyTransactionType.Redeem,
            },
            tx);

        if (alreadyRedeemed)
            return;

        var balance = await conn.ExecuteScalarAsync<decimal?>(
            """
            SELECT points_balance
            FROM customer_loyalty
            WHERE customer_id = @CustomerId AND program_id = @ProgramId
            FOR UPDATE
            """,
            new { CustomerId = customerId, ProgramId = programId },
            tx);

        if (balance is null || balance < pointsRedeemed)
            throw new InvalidOperationException("Số dư điểm không đủ để đổi.");

        await conn.ExecuteAsync(
            """
            UPDATE customer_loyalty
            SET points_balance = points_balance - @Points,
                updated_at = NOW()
            WHERE customer_id = @CustomerId AND program_id = @ProgramId
            """,
            new { CustomerId = customerId, ProgramId = programId, Points = pointsRedeemed },
            tx);

        await conn.ExecuteAsync(
            """
            INSERT INTO loyalty_transactions (
                tenant_id, customer_id, program_id, transaction_type, points, sales_order_id, notes)
            VALUES (@TenantId, @CustomerId, @ProgramId, @RedeemType, @Points, @OrderId, @Notes)
            """,
            new
            {
                TenantId = tenantId,
                CustomerId = customerId,
                ProgramId = programId,
                RedeemType = (short)LoyaltyTransactionType.Redeem,
                Points = -pointsRedeemed,
                OrderId = orderId,
                Notes = $"Đổi điểm đơn {orderNumber}",
            },
            tx);
    }

    public async Task<int> TryEarnForCompletedSaleAsync(
        Guid tenantId,
        Guid? customerId,
        Guid orderId,
        string orderNumber,
        decimal totalAmount,
        IDbConnection conn,
        IDbTransaction tx,
        CancellationToken cancellationToken)
    {
        if (customerId is not Guid customer)
            return 0;

        var loyaltyEnabled = await conn.ExecuteScalarAsync<bool>(
            """
            SELECT COALESCE((settings->>'loyalty_enabled')::boolean, false)
            FROM tenants
            WHERE id = @TenantId
            """,
            new { TenantId = tenantId },
            tx);

        if (!loyaltyEnabled)
            return 0;

        var program = await conn.QuerySingleOrDefaultAsync<LoyaltyProgramRow>(
            """
            SELECT
                id AS Id,
                program_code AS ProgramCode,
                program_name AS ProgramName,
                points_per_amount AS PointsPerAmount,
                amount_per_point AS AmountPerPoint,
                max_redeem_percent AS MaxRedeemPercent,
                status AS Status
            FROM loyalty_programs
            WHERE tenant_id = @TenantId
            ORDER BY created_at
            LIMIT 1
            """,
            new { TenantId = tenantId },
            tx);

        if (program is null || program.PointsPerAmount <= 0)
            return 0;

        var points = (int)Math.Floor(totalAmount / program.PointsPerAmount);
        if (points <= 0)
            return 0;

        var alreadyEarned = await conn.ExecuteScalarAsync<bool>(
            """
            SELECT EXISTS(
                SELECT 1 FROM loyalty_transactions
                WHERE tenant_id = @TenantId
                  AND sales_order_id = @OrderId
                  AND transaction_type = @EarnType
            )
            """,
            new
            {
                TenantId = tenantId,
                OrderId = orderId,
                EarnType = (short)LoyaltyTransactionType.Earn,
            },
            tx);

        if (alreadyEarned)
            return 0;

        var defaultTierId = await conn.ExecuteScalarAsync<Guid?>(
            """
            SELECT id FROM loyalty_tiers
            WHERE program_id = @ProgramId
            ORDER BY min_points ASC, sort_order ASC
            LIMIT 1
            """,
            new { ProgramId = program.Id },
            tx);

        var lifetimePoints = await conn.ExecuteScalarAsync<int>(
            """
            INSERT INTO customer_loyalty (customer_id, program_id, tier_id, points_balance, lifetime_points)
            VALUES (@CustomerId, @ProgramId, @TierId, @Points, @Points)
            ON CONFLICT (customer_id, program_id) DO UPDATE SET
                points_balance = customer_loyalty.points_balance + @Points,
                lifetime_points = customer_loyalty.lifetime_points + @Points,
                updated_at = NOW()
            RETURNING lifetime_points
            """,
            new
            {
                CustomerId = customer,
                ProgramId = program.Id,
                TierId = defaultTierId,
                Points = points,
            },
            tx);

        var tierId = await conn.ExecuteScalarAsync<Guid?>(
            """
            SELECT id FROM loyalty_tiers
            WHERE program_id = @ProgramId AND min_points <= @LifetimePoints
            ORDER BY min_points DESC, sort_order DESC
            LIMIT 1
            """,
            new { ProgramId = program.Id, LifetimePoints = lifetimePoints },
            tx);

        if (tierId is Guid resolvedTier)
        {
            await conn.ExecuteAsync(
                """
                UPDATE customer_loyalty
                SET tier_id = @TierId, updated_at = NOW()
                WHERE customer_id = @CustomerId AND program_id = @ProgramId
                """,
                new { TierId = resolvedTier, CustomerId = customer, ProgramId = program.Id },
                tx);
        }

        await conn.ExecuteAsync(
            """
            INSERT INTO loyalty_transactions (
                tenant_id, customer_id, program_id, transaction_type, points, sales_order_id, notes)
            VALUES (@TenantId, @CustomerId, @ProgramId, @EarnType, @Points, @OrderId, @Notes)
            """,
            new
            {
                TenantId = tenantId,
                CustomerId = customer,
                ProgramId = program.Id,
                EarnType = (short)LoyaltyTransactionType.Earn,
                Points = points,
                OrderId = orderId,
                Notes = $"Tích điểm đơn {orderNumber}",
            },
            tx);

        return points;
    }

    public async Task<Guid?> GetDefaultProgramIdAsync(
        Guid tenantId,
        IDbConnection conn,
        IDbTransaction tx,
        CancellationToken cancellationToken)
    {
        return await conn.ExecuteScalarAsync<Guid?>(
            """
            SELECT id FROM loyalty_programs
            WHERE tenant_id = @TenantId
            ORDER BY created_at
            LIMIT 1
            """,
            new { TenantId = tenantId },
            tx);
    }

    private static (int MaxPoints, decimal MaxDiscountAmount) ComputeRedeemLimits(
        decimal pointsBalance,
        decimal orderTotal,
        decimal amountPerPoint,
        decimal maxRedeemPercent)
    {
        if (orderTotal <= 0 || amountPerPoint <= 0 || pointsBalance <= 0)
            return (0, 0);

        var percent = Math.Clamp(maxRedeemPercent, 0m, 100m);
        var maxDiscountByPercent = Math.Round(orderTotal * percent / 100m, 0, MidpointRounding.AwayFromZero);
        var maxByBalance = pointsBalance * amountPerPoint;
        var maxDiscountAllowed = Math.Min(Math.Min(maxDiscountByPercent, orderTotal), maxByBalance);

        var maxPointsByDiscount = (int)Math.Floor(maxDiscountAllowed / amountPerPoint);
        var maxPointsByBalance = (int)Math.Floor(pointsBalance);
        var maxPointsByFullOrder = (int)Math.Floor(orderTotal / amountPerPoint);

        var maxPoints = Math.Max(0, Math.Min(maxPointsByBalance, Math.Min(maxPointsByFullOrder, maxPointsByDiscount)));
        return (maxPoints, maxDiscountAllowed);
    }

    private readonly IDbConnectionFactory _db;

    public LoyaltyPosService(IDbConnectionFactory db) => _db = db;
}
