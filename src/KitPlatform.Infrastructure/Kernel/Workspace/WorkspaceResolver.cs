using Dapper;
using KitPlatform.Infrastructure.Data;

namespace KitPlatform.Infrastructure.Kernel.Workspace;

public interface IWorkspaceResolver
{
    Task<Guid?> ResolveWorkspaceIdAsync(
        Guid tenantId,
        Guid? requestedWorkspaceId,
        string? packageCode = null,
        CancellationToken cancellationToken = default);
}

internal sealed class WorkspaceResolver : IWorkspaceResolver
{
    private readonly IDbConnectionFactory _db;

    public WorkspaceResolver(IDbConnectionFactory db) => _db = db;

    public async Task<Guid?> ResolveWorkspaceIdAsync(
        Guid tenantId,
        Guid? requestedWorkspaceId,
        string? packageCode = null,
        CancellationToken cancellationToken = default)
    {
        await using var conn = await _db.CreateOpenConnectionAsync(cancellationToken);

        if (requestedWorkspaceId is Guid requested)
        {
            var valid = await conn.ExecuteScalarAsync<bool>(
                """
                SELECT EXISTS(
                    SELECT 1 FROM kit_workspace.workspace_workspace
                    WHERE id = @WorkspaceId AND tenant_id = @TenantId AND deleted_at IS NULL
                )
                """,
                new { WorkspaceId = requested, TenantId = tenantId });
            return valid ? requested : null;
        }

        if (!string.IsNullOrWhiteSpace(packageCode))
        {
            var packWorkspace = await conn.QuerySingleOrDefaultAsync<Guid?>(
                """
                SELECT id FROM kit_workspace.workspace_workspace
                WHERE tenant_id = @TenantId AND package_code = @PackageCode AND deleted_at IS NULL
                LIMIT 1
                """,
                new { TenantId = tenantId, PackageCode = packageCode });
            if (packWorkspace.HasValue)
                return packWorkspace;
        }

        return await conn.QuerySingleOrDefaultAsync<Guid?>(
            """
            SELECT id FROM kit_workspace.workspace_workspace
            WHERE tenant_id = @TenantId AND is_default = TRUE AND deleted_at IS NULL
            LIMIT 1
            """,
            new { TenantId = tenantId });
    }
}
