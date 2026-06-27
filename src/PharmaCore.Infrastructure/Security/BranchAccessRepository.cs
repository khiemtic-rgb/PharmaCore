using Dapper;
using PharmaCore.Application.Abstractions;
using PharmaCore.Infrastructure.Data;

namespace PharmaCore.Infrastructure.Security;

internal sealed class BranchAccessRepository
{
    private readonly IDbConnectionFactory _db;

    public BranchAccessRepository(IDbConnectionFactory db) => _db = db;

    public async Task<BranchAccessScope> LoadScopeAsync(
        Guid userId,
        Guid tenantId,
        bool isAdmin,
        CancellationToken cancellationToken)
    {
        const string userSql = """
            SELECT employee_id AS EmployeeId
            FROM users
            WHERE id = @UserId AND tenant_id = @TenantId AND deleted_at IS NULL
            """;

        await using var conn = await _db.CreateOpenConnectionAsync(cancellationToken);
        var employeeId = await conn.QuerySingleOrDefaultAsync<Guid?>(userSql, new { UserId = userId, TenantId = tenantId });

        if (employeeId is null)
            return isAdmin ? BranchAccessScope.UnrestrictedScope() : BranchAccessScope.EmptyScope();

        const string branchSql = """
            SELECT eb.branch_id AS BranchId, eb.is_primary AS IsPrimary
            FROM employee_branches eb
            INNER JOIN branches b
              ON b.id = eb.branch_id AND b.tenant_id = @TenantId AND b.deleted_at IS NULL AND b.status = 1
            WHERE eb.employee_id = @EmployeeId
            """;

        var branches = (await conn.QueryAsync<(Guid BranchId, bool IsPrimary)>(
            branchSql,
            new { EmployeeId = employeeId, TenantId = tenantId })).ToList();

        if (branches.Count == 0)
            return isAdmin ? BranchAccessScope.UnrestrictedScope() : BranchAccessScope.EmptyScope();

        var branchIds = branches.Select(b => b.BranchId).ToList();
        var primaryBranchId = branches.FirstOrDefault(b => b.IsPrimary).BranchId;
        if (primaryBranchId == Guid.Empty)
            primaryBranchId = branchIds[0];

        const string warehouseSql = """
            SELECT id
            FROM warehouses
            WHERE tenant_id = @TenantId
              AND branch_id = ANY(@BranchIds)
              AND deleted_at IS NULL
              AND status = 1
            """;

        var warehouseIds = (await conn.QueryAsync<Guid>(
            warehouseSql,
            new { TenantId = tenantId, BranchIds = branchIds.ToArray() })).ToList();

        return new BranchAccessScope(false, branchIds, warehouseIds, primaryBranchId);
    }
}
