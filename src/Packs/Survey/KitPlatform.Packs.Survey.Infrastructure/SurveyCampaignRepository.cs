using Dapper;
using KitPlatform.Application.Abstractions;
using KitPlatform.Infrastructure.Data;
using KitPlatform.Infrastructure.Kernel.Workspace;
using KitPlatform.Packs.Survey;

namespace KitPlatform.Packs.Survey.Infrastructure;

internal sealed class SurveyCampaignRepository
{
    private readonly IDbConnectionFactory _db;
    private readonly ITenantContext _tenant;

    public SurveyCampaignRepository(IDbConnectionFactory db, ITenantContext tenant)
    {
        _db = db;
        _tenant = tenant;
    }

    private Guid TenantId => _tenant.TenantId;

    public async Task<IReadOnlyList<SurveyCampaignDto>> ListAsync(
        Guid workspaceId,
        string? status,
        CancellationToken cancellationToken)
    {
        var filters = new List<string>
        {
            "c.tenant_id = @TenantId",
            "c.workspace_id = @WorkspaceId",
            "c.deleted_at IS NULL",
        };
        if (!string.IsNullOrWhiteSpace(status))
            filters.Add("c.status = @Status");

        var where = string.Join(" AND ", filters);
        var sql = $"""
            SELECT
                c.id AS Id,
                c.template_id AS TemplateId,
                t.code AS TemplateCode,
                c.campaign_code AS CampaignCode,
                c.campaign_name AS CampaignName,
                c.status AS Status,
                c.settings::text AS SettingsJson,
                c.created_at AS CreatedAt,
                c.updated_at AS UpdatedAt
            FROM pack_survey.survey_campaign c
            INNER JOIN public.assessment_template t ON t.id = c.template_id
            WHERE {where}
            ORDER BY c.created_at DESC
            """;

        await using var conn = await _db.CreateOpenConnectionAsync(cancellationToken);
        return (await conn.QueryAsync<SurveyCampaignDto>(sql, new
        {
            TenantId,
            WorkspaceId = workspaceId,
            Status = status?.Trim(),
        })).ToList();
    }

    public async Task<SurveyCampaignDto?> GetAsync(
        Guid workspaceId,
        Guid id,
        CancellationToken cancellationToken)
    {
        const string sql = """
            SELECT
                c.id AS Id,
                c.template_id AS TemplateId,
                t.code AS TemplateCode,
                c.campaign_code AS CampaignCode,
                c.campaign_name AS CampaignName,
                c.status AS Status,
                c.settings::text AS SettingsJson,
                c.created_at AS CreatedAt,
                c.updated_at AS UpdatedAt
            FROM pack_survey.survey_campaign c
            INNER JOIN public.assessment_template t ON t.id = c.template_id
            WHERE c.id = @Id
              AND c.tenant_id = @TenantId
              AND c.workspace_id = @WorkspaceId
              AND c.deleted_at IS NULL
            """;

        await using var conn = await _db.CreateOpenConnectionAsync(cancellationToken);
        return await conn.QuerySingleOrDefaultAsync<SurveyCampaignDto>(sql, new
        {
            Id = id,
            TenantId,
            WorkspaceId = workspaceId,
        });
    }

    public async Task<bool> TemplateExistsAsync(Guid templateId, CancellationToken cancellationToken)
    {
        const string sql = """
            SELECT 1 FROM public.assessment_template
            WHERE id = @TemplateId AND status = 'active'
            LIMIT 1
            """;
        await using var conn = await _db.CreateOpenConnectionAsync(cancellationToken);
        return await conn.ExecuteScalarAsync<int?>(sql, new { TemplateId = templateId }) is not null;
    }

    public async Task<bool> CodeExistsAsync(
        Guid workspaceId,
        string campaignCode,
        Guid? excludeId,
        CancellationToken cancellationToken)
    {
        const string sql = """
            SELECT 1 FROM pack_survey.survey_campaign
            WHERE tenant_id = @TenantId
              AND workspace_id = @WorkspaceId
              AND campaign_code = @CampaignCode
              AND deleted_at IS NULL
              AND (@ExcludeId IS NULL OR id <> @ExcludeId)
            LIMIT 1
            """;
        await using var conn = await _db.CreateOpenConnectionAsync(cancellationToken);
        return await conn.ExecuteScalarAsync<int?>(sql, new
        {
            TenantId,
            WorkspaceId = workspaceId,
            CampaignCode = campaignCode,
            ExcludeId = excludeId,
        }) is not null;
    }

    public async Task<Guid> CreateAsync(
        Guid workspaceId,
        CreateSurveyCampaignRequest request,
        Guid? createdBy,
        CancellationToken cancellationToken)
    {
        var settings = string.IsNullOrWhiteSpace(request.SettingsJson) ? "{}" : request.SettingsJson;
        const string sql = """
            INSERT INTO pack_survey.survey_campaign (
                tenant_id, workspace_id, template_id, campaign_code, campaign_name, status, settings, created_by, updated_by
            )
            VALUES (
                @TenantId, @WorkspaceId, @TemplateId, @CampaignCode, @CampaignName, @Status, @Settings::jsonb, @CreatedBy, @CreatedBy
            )
            RETURNING id
            """;

        await using var conn = await _db.CreateOpenConnectionAsync(cancellationToken);
        return await conn.QuerySingleAsync<Guid>(sql, new
        {
            TenantId,
            WorkspaceId = workspaceId,
            TemplateId = request.TemplateId,
            CampaignCode = request.CampaignCode.Trim(),
            CampaignName = request.CampaignName.Trim(),
            Status = request.Status,
            Settings = settings,
            CreatedBy = createdBy,
        });
    }

    public async Task<bool> UpdateAsync(
        Guid workspaceId,
        Guid id,
        UpdateSurveyCampaignRequest request,
        Guid? updatedBy,
        CancellationToken cancellationToken)
    {
        var settings = string.IsNullOrWhiteSpace(request.SettingsJson) ? "{}" : request.SettingsJson;
        const string sql = """
            UPDATE pack_survey.survey_campaign
            SET campaign_name = @CampaignName,
                status = @Status,
                settings = @Settings::jsonb,
                updated_by = @UpdatedBy,
                updated_at = NOW()
            WHERE id = @Id
              AND tenant_id = @TenantId
              AND workspace_id = @WorkspaceId
              AND deleted_at IS NULL
            """;

        await using var conn = await _db.CreateOpenConnectionAsync(cancellationToken);
        var rows = await conn.ExecuteAsync(sql, new
        {
            Id = id,
            TenantId,
            WorkspaceId = workspaceId,
            CampaignName = request.CampaignName.Trim(),
            Status = request.Status,
            Settings = settings,
            UpdatedBy = updatedBy,
        });
        return rows > 0;
    }

    public async Task<bool> ArchiveAsync(Guid workspaceId, Guid id, CancellationToken cancellationToken)
    {
        const string sql = """
            UPDATE pack_survey.survey_campaign
            SET status = 'archived', deleted_at = NOW(), updated_at = NOW()
            WHERE id = @Id
              AND tenant_id = @TenantId
              AND workspace_id = @WorkspaceId
              AND deleted_at IS NULL
            """;
        await using var conn = await _db.CreateOpenConnectionAsync(cancellationToken);
        return await conn.ExecuteAsync(sql, new { Id = id, TenantId, WorkspaceId = workspaceId }) > 0;
    }
}

internal sealed class SurveyCampaignService : ISurveyCampaignService
{
    private static readonly HashSet<string> AllowedStatuses =
        new(StringComparer.OrdinalIgnoreCase) { "draft", "active", "archived" };

    private readonly SurveyCampaignRepository _repo;
    private readonly ITenantContext _tenant;
    private readonly IWorkspaceResolver _workspace;

    public SurveyCampaignService(
        SurveyCampaignRepository repo,
        ITenantContext tenant,
        IWorkspaceResolver workspace)
    {
        _repo = repo;
        _tenant = tenant;
        _workspace = workspace;
    }

    public async Task<IReadOnlyList<SurveyCampaignDto>> ListAsync(
        string? status = null,
        CancellationToken cancellationToken = default)
    {
        var workspaceId = await ResolveSurveyWorkspaceAsync(cancellationToken);
        if (workspaceId is null)
            return [];

        return await _repo.ListAsync(workspaceId.Value, status, cancellationToken);
    }

    public async Task<SurveyCampaignDto?> GetAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var workspaceId = await ResolveSurveyWorkspaceAsync(cancellationToken);
        if (workspaceId is null)
            return null;

        return await _repo.GetAsync(workspaceId.Value, id, cancellationToken);
    }

    public async Task<SurveyCampaignDto> CreateAsync(
        CreateSurveyCampaignRequest request,
        CancellationToken cancellationToken = default)
    {
        ValidateStatus(request.Status);
        if (string.IsNullOrWhiteSpace(request.CampaignCode) || string.IsNullOrWhiteSpace(request.CampaignName))
            throw new InvalidOperationException("Mã và tên chiến dịch khảo sát là bắt buộc.");

        var workspaceId = await ResolveSurveyWorkspaceAsync(cancellationToken)
            ?? throw new InvalidOperationException("Workspace pharmacy_survey chưa được provision.");

        if (!await _repo.TemplateExistsAsync(request.TemplateId, cancellationToken))
            throw new InvalidOperationException("Template khảo sát không tồn tại hoặc không active.");

        if (await _repo.CodeExistsAsync(workspaceId, request.CampaignCode.Trim(), null, cancellationToken))
            throw new InvalidOperationException("Mã chiến dịch đã tồn tại.");

        var actor = _tenant.IsAuthenticated ? _tenant.UserId : (Guid?)null;
        var id = await _repo.CreateAsync(workspaceId, request, actor, cancellationToken);
        return (await _repo.GetAsync(workspaceId, id, cancellationToken))!;
    }

    public async Task<SurveyCampaignDto?> UpdateAsync(
        Guid id,
        UpdateSurveyCampaignRequest request,
        CancellationToken cancellationToken = default)
    {
        ValidateStatus(request.Status);
        if (string.IsNullOrWhiteSpace(request.CampaignName))
            throw new InvalidOperationException("Tên chiến dịch là bắt buộc.");

        var workspaceId = await ResolveSurveyWorkspaceAsync(cancellationToken);
        if (workspaceId is null)
            return null;

        var actor = _tenant.IsAuthenticated ? _tenant.UserId : (Guid?)null;
        var updated = await _repo.UpdateAsync(workspaceId.Value, id, request, actor, cancellationToken);
        return updated ? await _repo.GetAsync(workspaceId.Value, id, cancellationToken) : null;
    }

    public async Task<bool> ArchiveAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var workspaceId = await ResolveSurveyWorkspaceAsync(cancellationToken);
        if (workspaceId is null)
            return false;

        return await _repo.ArchiveAsync(workspaceId.Value, id, cancellationToken);
    }

    private static void ValidateStatus(string status)
    {
        if (!AllowedStatuses.Contains(status))
            throw new InvalidOperationException("Trạng thái chiến dịch không hợp lệ.");
    }

    private Task<Guid?> ResolveSurveyWorkspaceAsync(CancellationToken cancellationToken) =>
        _workspace.ResolveWorkspaceIdAsync(
            _tenant.TenantId,
            _tenant.WorkspaceId,
            SurveyPackDefinition.PackCode,
            cancellationToken);
}
