using System.Text.Json;
using Microsoft.Extensions.Options;
using KitPlatform.Application.Configuration;
using KitPlatform.Packs.Survey;

namespace KitPlatform.Packs.Survey.Infrastructure;

internal sealed class AssessmentKapAdminService : IAssessmentKapAdminService
{
    private readonly AssessmentRepository _repo;
    private readonly IAssessmentTemplateService _templates;
    private readonly PlatformSettings _platform;

    public AssessmentKapAdminService(
        AssessmentRepository repo,
        IAssessmentTemplateService templates,
        IOptions<PlatformSettings> platform)
    {
        _repo = repo;
        _templates = templates;
        _platform = platform.Value;
    }

    public async Task<IReadOnlyList<KapTemplateListItemDto>> ListTemplatesAsync(
        CancellationToken cancellationToken = default)
    {
        EnsureEnabled();
        var rows = await _repo.ListTemplatesAsync(cancellationToken);
        return rows.Select(r => new KapTemplateListItemDto(
            r.Id, r.Code, r.Name, r.Version, r.Status, r.Description, r.UpdatedAt)).ToList();
    }

    public async Task<KapTemplateDetailDto?> GetTemplateAsync(
        Guid templateId,
        CancellationToken cancellationToken = default)
    {
        EnsureEnabled();
        var header = await _repo.GetTemplateHeaderByIdAsync(templateId, cancellationToken);
        if (header is null)
            return null;

        var tree = await _templates.GetByCodeAsync(header.Code, header.Version, cancellationToken);
        if (tree is null)
            return null;

        return new KapTemplateDetailDto(
            header.Id,
            header.Code,
            header.Name,
            header.Version,
            header.Status,
            header.Description,
            header.Verticals,
            tree);
    }

    public async Task<KapTemplateDetailDto?> UpdateTemplateAsync(
        Guid templateId,
        UpdateKapTemplateRequest request,
        CancellationToken cancellationToken = default)
    {
        EnsureEnabled();
        if (string.IsNullOrWhiteSpace(request.Name))
            throw new InvalidOperationException("Tên template là bắt buộc.");

        var status = request.Status.Trim().ToLowerInvariant();
        if (status is not ("draft" or "active" or "archived"))
            throw new InvalidOperationException("status không hợp lệ.");

        var updated = await _repo.UpdateTemplateHeaderAsync(
            templateId,
            request.Name.Trim(),
            request.Description?.Trim(),
            status,
            cancellationToken);

        return updated ? await GetTemplateAsync(templateId, cancellationToken) : null;
    }

    public async Task<IReadOnlyList<KapRuleDto>> ListRulesAsync(
        Guid templateId,
        CancellationToken cancellationToken = default)
    {
        EnsureEnabled();
        var rows = await _repo.ListRulesForTemplateAsync(templateId, cancellationToken);
        return rows.Select(MapRule).ToList();
    }

    public async Task<KapRuleDto> CreateRuleAsync(
        CreateKapRuleRequest request,
        CancellationToken cancellationToken = default)
    {
        EnsureEnabled();
        ValidateRuleRequest(request.Code, request.Name, request.Expression, request.ActionType, request.ActionPayloadJson);

        var id = await _repo.InsertRuleAsync(
            request.TemplateId,
            request.Code.Trim(),
            request.Name.Trim(),
            request.Expression.Trim(),
            request.ActionType.Trim().ToLowerInvariant(),
            request.ActionPayloadJson,
            request.Priority,
            request.IsActive,
            cancellationToken);

        var row = await _repo.GetRuleByIdAsync(id, cancellationToken)
            ?? throw new InvalidOperationException("Không tạo được rule.");

        return MapRule(row);
    }

    public async Task<KapRuleDto?> UpdateRuleAsync(
        Guid ruleId,
        UpdateKapRuleRequest request,
        CancellationToken cancellationToken = default)
    {
        EnsureEnabled();
        var existing = await _repo.GetRuleByIdAsync(ruleId, cancellationToken);
        if (existing is null)
            return null;

        ValidateRuleRequest(existing.Code, request.Name, request.Expression, request.ActionType, request.ActionPayloadJson);

        var updated = await _repo.UpdateRuleAsync(
            ruleId,
            request.Name.Trim(),
            request.Expression.Trim(),
            request.ActionType.Trim().ToLowerInvariant(),
            request.ActionPayloadJson,
            request.Priority,
            request.IsActive,
            cancellationToken);

        if (!updated)
            return null;

        var row = await _repo.GetRuleByIdAsync(ruleId, cancellationToken);
        return row is null ? null : MapRule(row);
    }

    public async Task<bool> DeleteRuleAsync(Guid ruleId, CancellationToken cancellationToken = default)
    {
        EnsureEnabled();
        return await _repo.DeleteRuleAsync(ruleId, cancellationToken);
    }

    private static KapRuleDto MapRule(KapRuleListRow row) =>
        new(
            row.Id,
            row.TemplateId,
            row.Code,
            row.Name,
            row.Expression,
            row.ActionType,
            row.ActionPayloadJson,
            row.Priority,
            row.IsActive);

    private static void ValidateRuleRequest(
        string code,
        string name,
        string expression,
        string actionType,
        string actionPayloadJson)
    {
        if (string.IsNullOrWhiteSpace(code) || string.IsNullOrWhiteSpace(name))
            throw new InvalidOperationException("Mã và tên rule là bắt buộc.");
        if (string.IsNullOrWhiteSpace(expression))
            throw new InvalidOperationException("Biểu thức rule là bắt buộc.");

        var type = actionType.Trim().ToLowerInvariant();
        if (type is not ("insight" or "recommendation"))
            throw new InvalidOperationException("actionType phải là insight hoặc recommendation.");

        try
        {
            JsonDocument.Parse(actionPayloadJson);
        }
        catch
        {
            throw new InvalidOperationException("actionPayloadJson không hợp lệ.");
        }
    }

    private void EnsureEnabled()
    {
        if (!_platform.IsKapAdminEnabled)
            throw new UnauthorizedAccessException("KAP admin không khả dụng trên triển khai này.");
    }
}
