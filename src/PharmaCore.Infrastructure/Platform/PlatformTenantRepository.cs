using System.Text.Json;
using Dapper;
using PharmaCore.Application.Platform;
using PharmaCore.Infrastructure.Data;

namespace PharmaCore.Infrastructure.Platform;

internal sealed class PlatformTenantRepository
{
    private readonly IDbConnectionFactory _db;

    public PlatformTenantRepository(IDbConnectionFactory db) => _db = db;

    public async Task<int> CountTenantsAsync(CancellationToken cancellationToken)
    {
        const string sql = "SELECT COUNT(*)::int FROM tenants WHERE deleted_at IS NULL";
        await using var conn = await _db.CreateOpenConnectionAsync(cancellationToken);
        return await conn.QuerySingleAsync<int>(sql);
    }

    public async Task<IReadOnlyList<PlatformTenantListItemDto>> ListTenantsAsync(CancellationToken cancellationToken)
    {
        const string sql = """
            SELECT
                id AS Id,
                tenant_code AS TenantCode,
                tenant_name AS TenantName,
                created_at AS CreatedAt,
                status AS Status
            FROM tenants
            WHERE deleted_at IS NULL
            ORDER BY created_at DESC
            """;

        await using var conn = await _db.CreateOpenConnectionAsync(cancellationToken);
        var rows = await conn.QueryAsync<PlatformTenantListItemDto>(sql);
        return rows.ToList();
    }

    public async Task<bool> TenantCodeExistsAsync(string tenantCode, CancellationToken cancellationToken)
    {
        const string sql = """
            SELECT EXISTS(
                SELECT 1 FROM tenants
                WHERE tenant_code = @TenantCode AND deleted_at IS NULL
            )
            """;

        await using var conn = await _db.CreateOpenConnectionAsync(cancellationToken);
        return await conn.QuerySingleAsync<bool>(sql, new { TenantCode = tenantCode });
    }

    public async Task<CreatePlatformTenantResponse> CreateTenantAsync(
        CreatePlatformTenantRequest request,
        string passwordHash,
        CancellationToken cancellationToken)
    {
        var tenantId = Guid.NewGuid();
        var branchId = Guid.NewGuid();
        var employeeId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        var roleId = Guid.NewGuid();
        var warehouseId = Guid.NewGuid();

        var settings = JsonSerializer.Serialize(new
        {
            allow_negative_stock = false,
            loyalty_enabled = request.LoyaltyEnabled,
            batch_mode = "suggest",
        });

        await using var conn = await _db.CreateOpenConnectionAsync(cancellationToken);
        await using var tx = await conn.BeginTransactionAsync(cancellationToken);

        const string tenantSql = """
            INSERT INTO tenants (id, tenant_code, tenant_name, country_code, default_currency, settings)
            VALUES (@Id, @TenantCode, @TenantName, 'VN', 'VND', @Settings::jsonb)
            """;

        await conn.ExecuteAsync(tenantSql, new
        {
            Id = tenantId,
            TenantCode = request.TenantCode,
            TenantName = request.TenantName,
            Settings = settings,
        }, tx);

        const string branchSql = """
            INSERT INTO branches (id, tenant_id, branch_code, branch_name, address, phone, is_head_office)
            VALUES (@Id, @TenantId, @BranchCode, @BranchName, @Address, @Phone, TRUE)
            """;

        await conn.ExecuteAsync(branchSql, new
        {
            Id = branchId,
            TenantId = tenantId,
            BranchCode = request.BranchCode,
            BranchName = request.BranchName,
            Address = string.IsNullOrWhiteSpace(request.BranchAddress) ? null : request.BranchAddress.Trim(),
            Phone = string.IsNullOrWhiteSpace(request.BranchPhone) ? null : request.BranchPhone.Trim(),
        }, tx);

        const string employeeSql = """
            INSERT INTO employees (id, tenant_id, employee_code, full_name, phone, email)
            VALUES (@Id, @TenantId, 'EMP001', @FullName, @Phone, @Email)
            """;

        await conn.ExecuteAsync(employeeSql, new
        {
            Id = employeeId,
            TenantId = tenantId,
            FullName = request.AdminFullName,
            Phone = string.IsNullOrWhiteSpace(request.BranchPhone) ? null : request.BranchPhone.Trim(),
            Email = request.AdminEmail,
        }, tx);

        await conn.ExecuteAsync(
            "INSERT INTO employee_branches (employee_id, branch_id, is_primary) VALUES (@EmployeeId, @BranchId, TRUE)",
            new { EmployeeId = employeeId, BranchId = branchId },
            tx);

        const string userSql = """
            INSERT INTO users (id, tenant_id, employee_id, username, email, password_hash)
            VALUES (@Id, @TenantId, @EmployeeId, @Username, @Email, @PasswordHash)
            """;

        await conn.ExecuteAsync(userSql, new
        {
            Id = userId,
            TenantId = tenantId,
            EmployeeId = employeeId,
            Username = request.AdminUsername,
            Email = request.AdminEmail,
            PasswordHash = passwordHash,
        }, tx);

        await conn.ExecuteAsync(
            "INSERT INTO roles (id, tenant_id, role_code, role_name) VALUES (@Id, @TenantId, 'ADMIN', 'Quản trị viên')",
            new { Id = roleId, TenantId = tenantId },
            tx);

        await conn.ExecuteAsync(
            "INSERT INTO user_roles (user_id, role_id) VALUES (@UserId, @RoleId)",
            new { UserId = userId, RoleId = roleId },
            tx);

        await conn.ExecuteAsync(
            """
            INSERT INTO role_permissions (role_id, permission_id)
            SELECT @RoleId, p.id FROM permissions p
            ON CONFLICT DO NOTHING
            """,
            new { RoleId = roleId },
            tx);

        const string warehouseSql = """
            INSERT INTO warehouses (id, tenant_id, branch_id, warehouse_code, warehouse_name, warehouse_type, is_default)
            VALUES (@Id, @TenantId, @BranchId, @WarehouseCode, @WarehouseName, 1, TRUE)
            """;

        await conn.ExecuteAsync(warehouseSql, new
        {
            Id = warehouseId,
            TenantId = tenantId,
            BranchId = branchId,
            WarehouseCode = request.WarehouseCode,
            WarehouseName = request.WarehouseName,
        }, tx);

        var branchCount = 1;
        if (request.AdditionalBranches is { Count: > 0 })
        {
            const string extraBranchSql = """
                INSERT INTO branches (id, tenant_id, branch_code, branch_name, address, phone, is_head_office)
                VALUES (@Id, @TenantId, @BranchCode, @BranchName, @Address, @Phone, FALSE)
                """;

            const string extraEmployeeBranchSql = """
                INSERT INTO employee_branches (employee_id, branch_id, is_primary)
                VALUES (@EmployeeId, @BranchId, FALSE)
                """;

            const string extraWarehouseSql = """
                INSERT INTO warehouses (id, tenant_id, branch_id, warehouse_code, warehouse_name, warehouse_type, is_default)
                VALUES (@Id, @TenantId, @BranchId, @WarehouseCode, @WarehouseName, 1, FALSE)
                """;

            foreach (var extra in request.AdditionalBranches)
            {
                var extraBranchId = Guid.NewGuid();
                var extraWarehouseId = Guid.NewGuid();

                await conn.ExecuteAsync(extraBranchSql, new
                {
                    Id = extraBranchId,
                    TenantId = tenantId,
                    BranchCode = extra.BranchCode,
                    BranchName = extra.BranchName,
                    Address = extra.BranchAddress,
                    Phone = extra.BranchPhone,
                }, tx);

                await conn.ExecuteAsync(extraEmployeeBranchSql, new
                {
                    EmployeeId = employeeId,
                    BranchId = extraBranchId,
                }, tx);

                await conn.ExecuteAsync(extraWarehouseSql, new
                {
                    Id = extraWarehouseId,
                    TenantId = tenantId,
                    BranchId = extraBranchId,
                    WarehouseCode = extra.WarehouseCode,
                    WarehouseName = extra.WarehouseName,
                }, tx);

                branchCount++;
            }
        }

        await tx.CommitAsync(cancellationToken);

        return new CreatePlatformTenantResponse(
            tenantId,
            request.TenantCode,
            request.TenantName,
            branchId,
            userId,
            request.AdminUsername,
            branchCount);
    }
}
