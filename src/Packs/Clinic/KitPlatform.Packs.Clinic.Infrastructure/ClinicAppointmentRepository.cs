using Dapper;
using KitPlatform.Application.Abstractions;
using KitPlatform.Infrastructure.Data;
using KitPlatform.Infrastructure.Kernel.Workspace;
using KitPlatform.Packs.Clinic;

namespace KitPlatform.Packs.Clinic.Infrastructure;

internal sealed class ClinicAppointmentRepository
{
    private readonly IDbConnectionFactory _db;
    private readonly ITenantContext _tenant;

    public ClinicAppointmentRepository(IDbConnectionFactory db, ITenantContext tenant)
    {
        _db = db;
        _tenant = tenant;
    }

    private Guid TenantId => _tenant.TenantId;

    public async Task<IReadOnlyList<ClinicAppointmentDto>> ListAsync(
        Guid? workspaceId,
        DateTimeOffset? from,
        DateTimeOffset? to,
        CancellationToken cancellationToken)
    {
        const string sql = """
            SELECT
                id AS Id,
                customer_id AS CustomerId,
                provider_id AS ProviderId,
                branch_id AS BranchId,
                appointment_at AS AppointmentAt,
                duration_minutes AS DurationMinutes,
                appointment_status AS AppointmentStatus,
                reason AS Reason,
                notes AS Notes,
                created_at AS CreatedAt
            FROM pack_clinic.clinic_appointment
            WHERE tenant_id = @TenantId
              AND deleted_at IS NULL
              AND (@WorkspaceId IS NULL OR workspace_id = @WorkspaceId)
              AND (@From IS NULL OR appointment_at >= @From)
              AND (@To IS NULL OR appointment_at <= @To)
            ORDER BY appointment_at
            LIMIT 200
            """;

        await using var conn = await _db.CreateOpenConnectionAsync(cancellationToken);
        return (await conn.QueryAsync<ClinicAppointmentDto>(sql, new
        {
            TenantId,
            WorkspaceId = workspaceId,
            From = from?.UtcDateTime,
            To = to?.UtcDateTime,
        })).ToList();
    }

    public async Task<Guid> CreateAsync(
        Guid? workspaceId,
        CreateClinicAppointmentRequest request,
        CancellationToken cancellationToken)
    {
        const string sql = """
            INSERT INTO pack_clinic.clinic_appointment (
                tenant_id, workspace_id, customer_id, provider_id, branch_id,
                appointment_at, duration_minutes, reason, notes
            )
            VALUES (
                @TenantId, @WorkspaceId, @CustomerId, @ProviderId, @BranchId,
                @AppointmentAt, @DurationMinutes, @Reason, @Notes
            )
            RETURNING id
            """;

        await using var conn = await _db.CreateOpenConnectionAsync(cancellationToken);
        return await conn.QuerySingleAsync<Guid>(sql, new
        {
            TenantId,
            WorkspaceId = workspaceId,
            request.CustomerId,
            request.ProviderId,
            request.BranchId,
            AppointmentAt = request.AppointmentAt.UtcDateTime,
            request.DurationMinutes,
            request.Reason,
            request.Notes,
        });
    }
}

internal sealed class ClinicAppointmentService : IClinicAppointmentService
{
    private readonly ClinicAppointmentRepository _repo;
    private readonly ITenantContext _tenant;
    private readonly IWorkspaceResolver _workspace;

    public ClinicAppointmentService(
        ClinicAppointmentRepository repo,
        ITenantContext tenant,
        IWorkspaceResolver workspace)
    {
        _repo = repo;
        _tenant = tenant;
        _workspace = workspace;
    }

    public async Task<IReadOnlyList<ClinicAppointmentDto>> ListAsync(
        DateTimeOffset? from,
        DateTimeOffset? to,
        CancellationToken cancellationToken = default)
    {
        var workspaceId = await ResolveClinicWorkspaceAsync(cancellationToken);
        return await _repo.ListAsync(workspaceId, from, to, cancellationToken);
    }

    public async Task<ClinicAppointmentDto> CreateAsync(
        CreateClinicAppointmentRequest request,
        CancellationToken cancellationToken = default)
    {
        if (request.DurationMinutes < 5 || request.DurationMinutes > 480)
            throw new InvalidOperationException("Thời lượng lịch hẹn không hợp lệ.");

        var workspaceId = await ResolveClinicWorkspaceAsync(cancellationToken)
            ?? throw new InvalidOperationException("Workspace clinic_crm chưa được provision.");

        var id = await _repo.CreateAsync(workspaceId, request, cancellationToken);
        var items = await _repo.ListAsync(workspaceId, null, null, cancellationToken);
        return items.First(i => i.Id == id);
    }

    private Task<Guid?> ResolveClinicWorkspaceAsync(CancellationToken cancellationToken) =>
        _workspace.ResolveWorkspaceIdAsync(
            _tenant.TenantId,
            _tenant.WorkspaceId,
            ClinicPackDefinition.PackCode,
            cancellationToken);
}
