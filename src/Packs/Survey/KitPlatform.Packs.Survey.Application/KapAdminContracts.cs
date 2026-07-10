namespace KitPlatform.Packs.Survey;

public sealed record KapTemplateListItemDto(
    Guid Id,
    string Code,
    string Name,
    string Version,
    string Status,
    string? Description,
    DateTimeOffset UpdatedAt);

public sealed record KapTemplateDetailDto(
    Guid Id,
    string Code,
    string Name,
    string Version,
    string Status,
    string? Description,
    IReadOnlyList<string> Verticals,
    AssessmentTemplateDto Tree);

public sealed record UpdateKapTemplateRequest(
    string Name,
    string? Description,
    string Status);

public sealed record KapRuleDto(
    Guid Id,
    Guid TemplateId,
    string Code,
    string Name,
    string Expression,
    string ActionType,
    string ActionPayloadJson,
    int Priority,
    bool IsActive);

public sealed record CreateKapRuleRequest(
    Guid TemplateId,
    string Code,
    string Name,
    string Expression,
    string ActionType,
    string ActionPayloadJson,
    int Priority = 50,
    bool IsActive = true);

public sealed record UpdateKapRuleRequest(
    string Name,
    string Expression,
    string ActionType,
    string ActionPayloadJson,
    int Priority,
    bool IsActive);

public interface IAssessmentKapAdminService
{
    Task<IReadOnlyList<KapTemplateListItemDto>> ListTemplatesAsync(CancellationToken cancellationToken = default);

    Task<KapTemplateDetailDto?> GetTemplateAsync(
        Guid templateId,
        CancellationToken cancellationToken = default);

    Task<KapTemplateDetailDto?> UpdateTemplateAsync(
        Guid templateId,
        UpdateKapTemplateRequest request,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<KapRuleDto>> ListRulesAsync(
        Guid templateId,
        CancellationToken cancellationToken = default);

    Task<KapRuleDto> CreateRuleAsync(
        CreateKapRuleRequest request,
        CancellationToken cancellationToken = default);

    Task<KapRuleDto?> UpdateRuleAsync(
        Guid ruleId,
        UpdateKapRuleRequest request,
        CancellationToken cancellationToken = default);

    Task<bool> DeleteRuleAsync(Guid ruleId, CancellationToken cancellationToken = default);
}
