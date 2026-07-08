using Dapper;
using KitPlatform.Application.Abstractions;
using KitPlatform.Infrastructure.Data;
using KitPlatform.Infrastructure.Kernel.Workspace;
using KitPlatform.Packs.Clinic;

namespace KitPlatform.Packs.Clinic.Infrastructure;

internal sealed class ClinicVisitRepository
{
    private readonly IDbConnectionFactory _db;
    private readonly ITenantContext _tenant;

    public ClinicVisitRepository(IDbConnectionFactory db, ITenantContext tenant)
    {
        _db = db;
        _tenant = tenant;
    }

    private Guid TenantId => _tenant.TenantId;

    public async Task<IReadOnlyList<ClinicVisitDto>> ListAsync(
        Guid? workspaceId,
        Guid? customerId,
        string? status,
        DateTimeOffset? from,
        DateTimeOffset? to,
        CancellationToken cancellationToken)
    {
        const string sql = """
            SELECT
                id AS Id,
                appointment_id AS AppointmentId,
                customer_id AS CustomerId,
                provider_id AS ProviderId,
                visit_status AS VisitStatus,
                chief_complaint AS ChiefComplaint,
                diagnosis_summary AS DiagnosisSummary,
                started_at AS StartedAt,
                closed_at AS ClosedAt,
                created_at AS CreatedAt
            FROM pack_clinic.clinic_visit
            WHERE tenant_id = @TenantId
              AND deleted_at IS NULL
              AND (@WorkspaceId IS NULL OR workspace_id = @WorkspaceId)
              AND (@CustomerId IS NULL OR customer_id = @CustomerId)
              AND (@Status IS NULL OR visit_status = @Status)
              AND (@From IS NULL OR started_at >= @From)
              AND (@To IS NULL OR started_at <= @To)
            ORDER BY started_at DESC
            LIMIT 200
            """;

        await using var conn = await _db.CreateOpenConnectionAsync(cancellationToken);
        return (await conn.QueryAsync<ClinicVisitDto>(sql, new
        {
            TenantId,
            WorkspaceId = workspaceId,
            CustomerId = customerId,
            Status = status,
            From = from?.UtcDateTime,
            To = to?.UtcDateTime,
        })).ToList();
    }

    public async Task<ClinicVisitDto?> GetAsync(
        Guid? workspaceId,
        Guid visitId,
        CancellationToken cancellationToken)
    {
        const string sql = """
            SELECT
                id AS Id,
                appointment_id AS AppointmentId,
                customer_id AS CustomerId,
                provider_id AS ProviderId,
                visit_status AS VisitStatus,
                chief_complaint AS ChiefComplaint,
                diagnosis_summary AS DiagnosisSummary,
                started_at AS StartedAt,
                closed_at AS ClosedAt,
                created_at AS CreatedAt
            FROM pack_clinic.clinic_visit
            WHERE tenant_id = @TenantId
              AND id = @VisitId
              AND deleted_at IS NULL
              AND (@WorkspaceId IS NULL OR workspace_id = @WorkspaceId)
            """;

        await using var conn = await _db.CreateOpenConnectionAsync(cancellationToken);
        return await conn.QuerySingleOrDefaultAsync<ClinicVisitDto>(sql, new
        {
            TenantId,
            VisitId = visitId,
            WorkspaceId = workspaceId,
        });
    }

    public async Task<Guid> CreateAsync(
        Guid workspaceId,
        CreateClinicVisitRequest request,
        CancellationToken cancellationToken)
    {
        const string sql = """
            INSERT INTO pack_clinic.clinic_visit (
                tenant_id, workspace_id, appointment_id, customer_id, provider_id, chief_complaint
            )
            VALUES (
                @TenantId, @WorkspaceId, @AppointmentId, @CustomerId, @ProviderId, @ChiefComplaint
            )
            RETURNING id
            """;

        await using var conn = await _db.CreateOpenConnectionAsync(cancellationToken);
        return await conn.QuerySingleAsync<Guid>(sql, new
        {
            TenantId,
            WorkspaceId = workspaceId,
            request.AppointmentId,
            request.CustomerId,
            request.ProviderId,
            request.ChiefComplaint,
        });
    }

    public async Task<bool> UpdateAsync(
        Guid? workspaceId,
        Guid visitId,
        UpdateClinicVisitRequest request,
        CancellationToken cancellationToken)
    {
        const string sql = """
            UPDATE pack_clinic.clinic_visit
            SET
                chief_complaint = COALESCE(@ChiefComplaint, chief_complaint),
                diagnosis_summary = COALESCE(@DiagnosisSummary, diagnosis_summary),
                visit_status = COALESCE(@VisitStatus, visit_status),
                closed_at = CASE
                    WHEN @VisitStatus = 'closed' AND closed_at IS NULL THEN NOW()
                    WHEN @VisitStatus IS NOT NULL AND @VisitStatus <> 'closed' THEN NULL
                    ELSE closed_at
                END,
                updated_at = NOW()
            WHERE tenant_id = @TenantId
              AND id = @VisitId
              AND deleted_at IS NULL
              AND (@WorkspaceId IS NULL OR workspace_id = @WorkspaceId)
            """;

        await using var conn = await _db.CreateOpenConnectionAsync(cancellationToken);
        var rows = await conn.ExecuteAsync(sql, new
        {
            TenantId,
            VisitId = visitId,
            WorkspaceId = workspaceId,
            request.ChiefComplaint,
            request.DiagnosisSummary,
            request.VisitStatus,
        });
        return rows > 0;
    }

    public async Task<IReadOnlyList<ClinicVisitNoteDto>> ListNotesAsync(
        Guid? workspaceId,
        Guid visitId,
        CancellationToken cancellationToken)
    {
        const string sql = """
            SELECT
                n.id AS Id,
                n.visit_id AS VisitId,
                n.note_type AS NoteType,
                n.note_body AS NoteBody,
                n.author_user_id AS AuthorUserId,
                n.created_at AS CreatedAt
            FROM pack_clinic.clinic_visit_note n
            INNER JOIN pack_clinic.clinic_visit v ON v.id = n.visit_id
            WHERE n.tenant_id = @TenantId
              AND n.visit_id = @VisitId
              AND n.deleted_at IS NULL
              AND v.deleted_at IS NULL
              AND (@WorkspaceId IS NULL OR v.workspace_id = @WorkspaceId)
            ORDER BY n.created_at DESC
            LIMIT 200
            """;

        await using var conn = await _db.CreateOpenConnectionAsync(cancellationToken);
        return (await conn.QueryAsync<ClinicVisitNoteDto>(sql, new
        {
            TenantId,
            VisitId = visitId,
            WorkspaceId = workspaceId,
        })).ToList();
    }

    public async Task<Guid> AddNoteAsync(
        Guid workspaceId,
        Guid visitId,
        Guid? authorUserId,
        CreateClinicVisitNoteRequest request,
        CancellationToken cancellationToken)
    {
        const string sql = """
            INSERT INTO pack_clinic.clinic_visit_note (
                tenant_id, workspace_id, visit_id, note_type, note_body, author_user_id
            )
            SELECT
                v.tenant_id, v.workspace_id, v.id, @NoteType, @NoteBody, @AuthorUserId
            FROM pack_clinic.clinic_visit v
            WHERE v.tenant_id = @TenantId
              AND v.id = @VisitId
              AND v.deleted_at IS NULL
              AND v.workspace_id = @WorkspaceId
            RETURNING id
            """;

        await using var conn = await _db.CreateOpenConnectionAsync(cancellationToken);
        return await conn.QuerySingleAsync<Guid>(sql, new
        {
            TenantId,
            WorkspaceId = workspaceId,
            VisitId = visitId,
            request.NoteType,
            request.NoteBody,
            AuthorUserId = authorUserId,
        });
    }
}

internal sealed class ClinicVisitService : IClinicVisitService
{
    private static readonly HashSet<string> AllowedStatuses = new(StringComparer.OrdinalIgnoreCase)
    {
        "open", "closed", "cancelled",
    };

    private static readonly HashSet<string> AllowedNoteTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "clinical", "admin", "follow_up",
    };

    private readonly ClinicVisitRepository _repo;
    private readonly ITenantContext _tenant;
    private readonly IWorkspaceResolver _workspace;

    public ClinicVisitService(
        ClinicVisitRepository repo,
        ITenantContext tenant,
        IWorkspaceResolver workspace)
    {
        _repo = repo;
        _tenant = tenant;
        _workspace = workspace;
    }

    public async Task<IReadOnlyList<ClinicVisitDto>> ListAsync(
        Guid? customerId,
        string? status,
        DateTimeOffset? from,
        DateTimeOffset? to,
        CancellationToken cancellationToken = default)
    {
        if (status is not null && !AllowedStatuses.Contains(status))
            throw new InvalidOperationException("Trạng thái lượt khám không hợp lệ.");

        var workspaceId = await ResolveClinicWorkspaceAsync(cancellationToken);
        return await _repo.ListAsync(workspaceId, customerId, status, from, to, cancellationToken);
    }

    public async Task<ClinicVisitDto?> GetAsync(Guid visitId, CancellationToken cancellationToken = default)
    {
        var workspaceId = await ResolveClinicWorkspaceAsync(cancellationToken);
        return await _repo.GetAsync(workspaceId, visitId, cancellationToken);
    }

    public async Task<ClinicVisitDto> CreateAsync(
        CreateClinicVisitRequest request,
        CancellationToken cancellationToken = default)
    {
        var workspaceId = await ResolveClinicWorkspaceAsync(cancellationToken)
            ?? throw new InvalidOperationException("Workspace clinic_crm chưa được provision.");

        var id = await _repo.CreateAsync(workspaceId, request, cancellationToken);
        return (await _repo.GetAsync(workspaceId, id, cancellationToken))!;
    }

    public async Task<ClinicVisitDto?> UpdateAsync(
        Guid visitId,
        UpdateClinicVisitRequest request,
        CancellationToken cancellationToken = default)
    {
        if (request.VisitStatus is not null && !AllowedStatuses.Contains(request.VisitStatus))
            throw new InvalidOperationException("Trạng thái lượt khám không hợp lệ.");

        var workspaceId = await ResolveClinicWorkspaceAsync(cancellationToken);
        var updated = await _repo.UpdateAsync(workspaceId, visitId, request, cancellationToken);
        if (!updated) return null;
        return await _repo.GetAsync(workspaceId, visitId, cancellationToken);
    }

    public async Task<IReadOnlyList<ClinicVisitNoteDto>> ListNotesAsync(
        Guid visitId,
        CancellationToken cancellationToken = default)
    {
        var workspaceId = await ResolveClinicWorkspaceAsync(cancellationToken);
        return await _repo.ListNotesAsync(workspaceId, visitId, cancellationToken);
    }

    public async Task<ClinicVisitNoteDto> AddNoteAsync(
        Guid visitId,
        CreateClinicVisitNoteRequest request,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.NoteBody))
            throw new InvalidOperationException("Nội dung ghi chú không được để trống.");
        if (!AllowedNoteTypes.Contains(request.NoteType))
            throw new InvalidOperationException("Loại ghi chú không hợp lệ.");

        var workspaceId = await ResolveClinicWorkspaceAsync(cancellationToken)
            ?? throw new InvalidOperationException("Workspace clinic_crm chưa được provision.");

        var noteId = await _repo.AddNoteAsync(
            workspaceId,
            visitId,
            _tenant.UserId,
            request,
            cancellationToken);

        var notes = await _repo.ListNotesAsync(workspaceId, visitId, cancellationToken);
        return notes.First(n => n.Id == noteId);
    }

    private Task<Guid?> ResolveClinicWorkspaceAsync(CancellationToken cancellationToken) =>
        _workspace.ResolveWorkspaceIdAsync(
            _tenant.TenantId,
            _tenant.WorkspaceId,
            ClinicPackDefinition.PackCode,
            cancellationToken);
}
