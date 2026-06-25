using System.Data;
using Dapper;
using PharmaCore.Infrastructure.Data;

namespace PharmaCore.Infrastructure.Loyalty;

internal sealed class LoyaltyAdminRepository
{
    private readonly IDbConnectionFactory _db;

    public LoyaltyAdminRepository(IDbConnectionFactory db) => _db = db;

    public async Task<bool> GetLoyaltyEnabledAsync(Guid tenantId, CancellationToken cancellationToken)
    {
        const string sql = """
            SELECT COALESCE((settings->>'loyalty_enabled')::boolean, false)
            FROM tenants
            WHERE id = @TenantId
            """;

        await using var conn = await _db.CreateOpenConnectionAsync(cancellationToken);
        return await conn.ExecuteScalarAsync<bool>(sql, new { TenantId = tenantId });
    }

    public async Task SetLoyaltyEnabledAsync(
        Guid tenantId,
        bool enabled,
        IDbConnection conn,
        IDbTransaction tx)
    {
        const string sql = """
            UPDATE tenants
            SET settings = jsonb_set(
                COALESCE(settings, '{}'::jsonb),
                '{loyalty_enabled}',
                to_jsonb(@Enabled::boolean),
                true
            ),
            updated_at = NOW()
            WHERE id = @TenantId
            """;

        await conn.ExecuteAsync(sql, new { TenantId = tenantId, Enabled = enabled }, tx);
    }

    public async Task<LoyaltyProgramRow?> GetDefaultProgramAsync(
        Guid tenantId,
        CancellationToken cancellationToken,
        IDbConnection? conn = null,
        IDbTransaction? tx = null)
    {
        const string sql = """
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
            """;

        if (conn is not null)
        {
            return await conn.QuerySingleOrDefaultAsync<LoyaltyProgramRow>(
                sql, new { TenantId = tenantId }, tx);
        }

        await using var localConn = await _db.CreateOpenConnectionAsync(cancellationToken);
        return await localConn.QuerySingleOrDefaultAsync<LoyaltyProgramRow>(sql, new { TenantId = tenantId });
    }

    public async Task<IReadOnlyList<LoyaltyTierRow>> GetTiersAsync(Guid programId, CancellationToken cancellationToken)
    {
        const string sql = """
            SELECT
                id AS Id,
                tier_code AS TierCode,
                tier_name AS TierName,
                min_points AS MinPoints,
                discount_percent AS DiscountPercent,
                sort_order AS SortOrder
            FROM loyalty_tiers
            WHERE program_id = @ProgramId
            ORDER BY sort_order, min_points
            """;

        await using var conn = await _db.CreateOpenConnectionAsync(cancellationToken);
        var rows = await conn.QueryAsync<LoyaltyTierRow>(sql, new { ProgramId = programId });
        return rows.AsList();
    }

    public async Task<Guid> InsertProgramAsync(
        Guid tenantId,
        string programCode,
        string programName,
        decimal pointsPerAmount,
        decimal amountPerPoint,
        decimal maxRedeemPercent,
        short status,
        IDbConnection conn,
        IDbTransaction tx)
    {
        const string sql = """
            INSERT INTO loyalty_programs (
                tenant_id, program_code, program_name, points_per_amount, amount_per_point,
                max_redeem_percent, status)
            VALUES (@TenantId, @ProgramCode, @ProgramName, @PointsPerAmount, @AmountPerPoint,
                @MaxRedeemPercent, @Status)
            RETURNING id
            """;

        return await conn.ExecuteScalarAsync<Guid>(sql, new
        {
            TenantId = tenantId,
            ProgramCode = programCode,
            ProgramName = programName,
            PointsPerAmount = pointsPerAmount,
            AmountPerPoint = amountPerPoint,
            MaxRedeemPercent = maxRedeemPercent,
            Status = status,
        }, tx);
    }

    public async Task UpdateProgramAsync(
        Guid programId,
        Guid tenantId,
        string programName,
        decimal pointsPerAmount,
        decimal amountPerPoint,
        decimal maxRedeemPercent,
        short status,
        IDbConnection conn,
        IDbTransaction tx)
    {
        const string sql = """
            UPDATE loyalty_programs
            SET program_name = @ProgramName,
                points_per_amount = @PointsPerAmount,
                amount_per_point = @AmountPerPoint,
                max_redeem_percent = @MaxRedeemPercent,
                status = @Status,
                updated_at = NOW()
            WHERE id = @ProgramId AND tenant_id = @TenantId
            """;

        var affected = await conn.ExecuteAsync(sql, new
        {
            ProgramId = programId,
            TenantId = tenantId,
            ProgramName = programName,
            PointsPerAmount = pointsPerAmount,
            AmountPerPoint = amountPerPoint,
            MaxRedeemPercent = maxRedeemPercent,
            Status = status,
        }, tx);

        if (affected == 0)
            throw new InvalidOperationException("Không tìm thấy chương trình tích điểm.");
    }

    public async Task UpsertTierAsync(
        Guid programId,
        Guid? tierId,
        string tierCode,
        string tierName,
        int minPoints,
        decimal discountPercent,
        int sortOrder,
        IDbConnection conn,
        IDbTransaction tx)
    {
        if (tierId is Guid id)
        {
            const string updateSql = """
                UPDATE loyalty_tiers
                SET tier_code = @TierCode,
                    tier_name = @TierName,
                    min_points = @MinPoints,
                    discount_percent = @DiscountPercent,
                    sort_order = @SortOrder
                WHERE id = @TierId AND program_id = @ProgramId
                """;

            var affected = await conn.ExecuteAsync(updateSql, new
            {
                TierId = id,
                ProgramId = programId,
                TierCode = tierCode,
                TierName = tierName,
                MinPoints = minPoints,
                DiscountPercent = discountPercent,
                SortOrder = sortOrder,
            }, tx);

            if (affected == 0)
                throw new InvalidOperationException($"Không tìm thấy hạng {tierCode}.");
            return;
        }

        const string insertSql = """
            INSERT INTO loyalty_tiers (
                program_id, tier_code, tier_name, min_points, discount_percent, sort_order)
            VALUES (@ProgramId, @TierCode, @TierName, @MinPoints, @DiscountPercent, @SortOrder)
            """;

        await conn.ExecuteAsync(insertSql, new
        {
            ProgramId = programId,
            TierCode = tierCode,
            TierName = tierName,
            MinPoints = minPoints,
            DiscountPercent = discountPercent,
            SortOrder = sortOrder,
        }, tx);
    }

    public async Task<bool> IsTierInUseAsync(Guid tierId, IDbConnection conn, IDbTransaction tx) =>
        await conn.ExecuteScalarAsync<bool>(
            "SELECT EXISTS(SELECT 1 FROM customer_loyalty WHERE tier_id = @TierId)",
            new { TierId = tierId },
            tx);

    public async Task DeleteTierAsync(Guid tierId, Guid programId, IDbConnection conn, IDbTransaction tx)
    {
        var affected = await conn.ExecuteAsync(
            "DELETE FROM loyalty_tiers WHERE id = @TierId AND program_id = @ProgramId",
            new { TierId = tierId, ProgramId = programId },
            tx);
        if (affected == 0)
            throw new InvalidOperationException("Không xóa được hạng thành viên.");
    }

    public async Task<IReadOnlyList<Guid>> GetTierIdsAsync(Guid programId, IDbConnection conn, IDbTransaction tx)
    {
        var ids = await conn.QueryAsync<Guid>(
            "SELECT id FROM loyalty_tiers WHERE program_id = @ProgramId",
            new { ProgramId = programId },
            tx);
        return ids.AsList();
    }
}

internal sealed record LoyaltyProgramRow(
    Guid Id,
    string ProgramCode,
    string ProgramName,
    decimal PointsPerAmount,
    decimal AmountPerPoint,
    decimal MaxRedeemPercent,
    short Status);

internal sealed record LoyaltyTierRow(
    Guid Id,
    string TierCode,
    string TierName,
    int MinPoints,
    decimal DiscountPercent,
    int SortOrder);
