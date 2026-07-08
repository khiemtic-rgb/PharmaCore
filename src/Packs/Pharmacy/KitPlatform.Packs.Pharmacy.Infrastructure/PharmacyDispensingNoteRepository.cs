using Dapper;
using KitPlatform.Application.Abstractions;
using KitPlatform.Infrastructure.Data;
using KitPlatform.Infrastructure.Kernel.Workspace;
using KitPlatform.Packs.Pharmacy;

namespace KitPlatform.Packs.Pharmacy.Infrastructure;

internal sealed class PharmacyDispensingNoteRepository
{
    private readonly IDbConnectionFactory _db;
    private readonly ITenantContext _tenant;

    public PharmacyDispensingNoteRepository(IDbConnectionFactory db, ITenantContext tenant)
    {
        _db = db;
        _tenant = tenant;
    }

    private Guid TenantId => _tenant.TenantId;

    public async Task<IReadOnlyList<PharmacyDispensingNoteDto>> ListBySalesOrderAsync(
        Guid workspaceId,
        Guid salesOrderId,
        CancellationToken cancellationToken)
    {
        const string sql = """
            SELECT
                id AS Id,
                sales_order_id AS SalesOrderId,
                customer_id AS CustomerId,
                note_type AS NoteType,
                note_text AS NoteText,
                created_at AS CreatedAt
            FROM pack_pharmacy.pharmacy_dispensing_note
            WHERE tenant_id = @TenantId
              AND workspace_id = @WorkspaceId
              AND sales_order_id = @SalesOrderId
              AND deleted_at IS NULL
            ORDER BY created_at DESC
            """;

        await using var conn = await _db.CreateOpenConnectionAsync(cancellationToken);
        var rows = await conn.QueryAsync<PharmacyDispensingNoteDto>(sql, new
        {
            TenantId,
            WorkspaceId = workspaceId,
            SalesOrderId = salesOrderId,
        });
        return rows.ToList();
    }

    public async Task<Guid> CreateAsync(
        Guid workspaceId,
        CreatePharmacyDispensingNoteRequest request,
        CancellationToken cancellationToken)
    {
        const string verifySql = """
            SELECT 1 FROM public.sales_orders
            WHERE id = @SalesOrderId AND tenant_id = @TenantId
            LIMIT 1
            """;

        const string insertSql = """
            INSERT INTO pack_pharmacy.pharmacy_dispensing_note (
                tenant_id, workspace_id, sales_order_id, customer_id, note_type, note_text, created_by
            )
            VALUES (
                @TenantId, @WorkspaceId, @SalesOrderId, @CustomerId, @NoteType, @NoteText, @CreatedBy
            )
            RETURNING id
            """;

        await using var conn = await _db.CreateOpenConnectionAsync(cancellationToken);
        var exists = await conn.ExecuteScalarAsync<int?>(verifySql, new
        {
            TenantId,
            SalesOrderId = request.SalesOrderId,
        });
        if (exists is null)
            throw new InvalidOperationException("Đơn bán không tồn tại.");

        return await conn.QuerySingleAsync<Guid>(insertSql, new
        {
            TenantId,
            WorkspaceId = workspaceId,
            SalesOrderId = request.SalesOrderId,
            CustomerId = request.CustomerId,
            NoteType = request.NoteType,
            NoteText = request.NoteText,
            CreatedBy = _tenant.IsAuthenticated ? _tenant.UserId : (Guid?)null,
        });
    }
}

internal sealed class PharmacyDispensingNoteService : IPharmacyDispensingNoteService
{
    private static readonly HashSet<string> AllowedNoteTypes =
        new(StringComparer.OrdinalIgnoreCase) { "counseling", "dispensing", "interaction", "adherence", "other" };

    private readonly PharmacyDispensingNoteRepository _repo;
    private readonly ITenantContext _tenant;
    private readonly IWorkspaceResolver _workspace;

    public PharmacyDispensingNoteService(
        PharmacyDispensingNoteRepository repo,
        ITenantContext tenant,
        IWorkspaceResolver workspace)
    {
        _repo = repo;
        _tenant = tenant;
        _workspace = workspace;
    }

    public async Task<IReadOnlyList<PharmacyDispensingNoteDto>> ListBySalesOrderAsync(
        Guid salesOrderId,
        CancellationToken cancellationToken = default)
    {
        var workspaceId = await ResolvePharmacyWorkspaceAsync(cancellationToken);
        if (workspaceId is null)
            return [];

        return await _repo.ListBySalesOrderAsync(workspaceId.Value, salesOrderId, cancellationToken);
    }

    public async Task<PharmacyDispensingNoteDto> CreateAsync(
        CreatePharmacyDispensingNoteRequest request,
        CancellationToken cancellationToken = default)
    {
        if (!AllowedNoteTypes.Contains(request.NoteType))
            throw new InvalidOperationException("Loại ghi chú không hợp lệ.");

        var workspaceId = await ResolvePharmacyWorkspaceAsync(cancellationToken)
            ?? throw new InvalidOperationException("Workspace pharmacy chưa được provision.");

        var id = await _repo.CreateAsync(workspaceId, request, cancellationToken);
        var items = await _repo.ListBySalesOrderAsync(workspaceId, request.SalesOrderId, cancellationToken);
        return items.First(i => i.Id == id);
    }

    private Task<Guid?> ResolvePharmacyWorkspaceAsync(CancellationToken cancellationToken) =>
        _workspace.ResolveWorkspaceIdAsync(
            _tenant.TenantId,
            _tenant.WorkspaceId,
            PharmacyPackDefinition.TenantPackageCode,
            cancellationToken);
}
