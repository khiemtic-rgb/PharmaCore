using Dapper;
using KitPlatform.Application.Abstractions;
using KitPlatform.Infrastructure.Data;
using KitPlatform.Infrastructure.Kernel.Workspace;
using KitPlatform.Packs.Clinic;

namespace KitPlatform.Packs.Clinic.Infrastructure;

internal sealed class CrmLeadRepository
{
    private readonly IDbConnectionFactory _db;
    private readonly ITenantContext _tenant;

    public CrmLeadRepository(IDbConnectionFactory db, ITenantContext tenant)
    {
        _db = db;
        _tenant = tenant;
    }

    private Guid TenantId => _tenant.TenantId;

    public async Task<IReadOnlyList<CrmLeadDto>> ListAsync(
        Guid? workspaceId,
        string? status,
        CancellationToken cancellationToken)
    {
        const string sql = """
            SELECT
                id AS Id,
                lead_code AS LeadCode,
                full_name AS FullName,
                phone AS Phone,
                email AS Email,
                lead_status AS LeadStatus,
                source AS Source,
                created_at AS CreatedAt
            FROM pack_crm.crm_lead
            WHERE tenant_id = @TenantId
              AND deleted_at IS NULL
              AND (@WorkspaceId IS NULL OR workspace_id = @WorkspaceId)
              AND (@Status IS NULL OR lead_status = @Status)
            ORDER BY created_at DESC
            LIMIT 200
            """;

        await using var conn = await _db.CreateOpenConnectionAsync(cancellationToken);
        return (await conn.QueryAsync<CrmLeadDto>(sql, new
        {
            TenantId,
            WorkspaceId = workspaceId,
            Status = status,
        })).ToList();
    }

    public async Task<Guid> CreateAsync(
        Guid? workspaceId,
        CreateCrmLeadRequest request,
        CancellationToken cancellationToken)
    {
        const string sql = """
            INSERT INTO pack_crm.crm_lead (
                tenant_id, workspace_id, customer_id, lead_code, full_name,
                phone, email, source, notes
            )
            VALUES (
                @TenantId, @WorkspaceId, @CustomerId, @LeadCode, @FullName,
                @Phone, @Email, @Source, @Notes
            )
            RETURNING id
            """;

        await using var conn = await _db.CreateOpenConnectionAsync(cancellationToken);
        return await conn.QuerySingleAsync<Guid>(sql, new
        {
            TenantId,
            WorkspaceId = workspaceId,
            request.CustomerId,
            request.LeadCode,
            request.FullName,
            request.Phone,
            request.Email,
            request.Source,
            request.Notes,
        });
    }
}

internal sealed class CrmLeadService : ICrmLeadService
{
    private readonly CrmLeadRepository _repo;
    private readonly ITenantContext _tenant;
    private readonly IWorkspaceResolver _workspace;

    public CrmLeadService(
        CrmLeadRepository repo,
        ITenantContext tenant,
        IWorkspaceResolver workspace)
    {
        _repo = repo;
        _tenant = tenant;
        _workspace = workspace;
    }

    public async Task<IReadOnlyList<CrmLeadDto>> ListAsync(
        string? status,
        CancellationToken cancellationToken = default)
    {
        var workspaceId = await ResolveCrmWorkspaceAsync(cancellationToken);
        return await _repo.ListAsync(workspaceId, status, cancellationToken);
    }

    public async Task<CrmLeadDto> CreateAsync(
        CreateCrmLeadRequest request,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.LeadCode) || string.IsNullOrWhiteSpace(request.FullName))
            throw new InvalidOperationException("Mã lead và họ tên là bắt buộc.");

        var workspaceId = await ResolveCrmWorkspaceAsync(cancellationToken)
            ?? throw new InvalidOperationException("Workspace clinic_crm chưa được provision.");

        var id = await _repo.CreateAsync(workspaceId, request, cancellationToken);
        var items = await _repo.ListAsync(workspaceId, null, cancellationToken);
        return items.First(i => i.Id == id);
    }

    private Task<Guid?> ResolveCrmWorkspaceAsync(CancellationToken cancellationToken) =>
        _workspace.ResolveWorkspaceIdAsync(
            _tenant.TenantId,
            _tenant.WorkspaceId,
            ClinicPackDefinition.PackCode,
            cancellationToken);
}
