using System.Security.Claims;
using Dapper;
using Microsoft.AspNetCore.Http;
using KitPlatform.Infrastructure.Security;

namespace KitPlatform.Infrastructure.Data;

/// <summary>
/// Opens connections and sets <c>app.tenant_id</c> / <c>app.workspace_id</c> for RLS (P1.5).
/// </summary>
public sealed class TenantScopedNpgsqlConnectionFactory : IDbConnectionFactory
{
    private readonly string _connectionString;
    private readonly IHttpContextAccessor _httpContextAccessor;

    public TenantScopedNpgsqlConnectionFactory(
        string connectionString,
        IHttpContextAccessor httpContextAccessor)
    {
        DapperTypeHandlers.EnsureRegistered();
        _connectionString = connectionString;
        _httpContextAccessor = httpContextAccessor;
    }

    public async Task<Npgsql.NpgsqlConnection> CreateOpenConnectionAsync(
        CancellationToken cancellationToken = default)
    {
        var connection = new Npgsql.NpgsqlConnection(_connectionString);
        await connection.OpenAsync(cancellationToken);
        await ApplySessionContextAsync(connection, cancellationToken);
        return connection;
    }

    private async Task ApplySessionContextAsync(
        Npgsql.NpgsqlConnection connection,
        CancellationToken cancellationToken)
    {
        var http = _httpContextAccessor.HttpContext;
        if (http?.User.Identity?.IsAuthenticated != true)
            return;

        if (Guid.TryParse(http.User.FindFirst("tenant_id")?.Value, out var tenantId))
        {
            await connection.ExecuteAsync(
                new CommandDefinition(
                    "SELECT set_config('app.tenant_id', @Value, false)",
                    new { Value = tenantId.ToString() },
                    cancellationToken: cancellationToken));
        }

        if (http.Items.TryGetValue(WorkspaceResolutionMiddleware.WorkspaceIdItemKey, out var wsObj)
            && wsObj is Guid workspaceId)
        {
            await connection.ExecuteAsync(
                new CommandDefinition(
                    "SELECT set_config('app.workspace_id', @Value, false)",
                    new { Value = workspaceId.ToString() },
                    cancellationToken: cancellationToken));
        }
    }
}
