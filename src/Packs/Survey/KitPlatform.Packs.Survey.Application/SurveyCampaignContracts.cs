namespace KitPlatform.Packs.Survey;

public sealed record SurveyCampaignDto(
    Guid Id,
    Guid TemplateId,
    string TemplateCode,
    string CampaignCode,
    string CampaignName,
    string Status,
    string SettingsJson,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);

public sealed record CreateSurveyCampaignRequest(
    Guid TemplateId,
    string CampaignCode,
    string CampaignName,
    string Status = "active",
    string? SettingsJson = null);

public sealed record UpdateSurveyCampaignRequest(
    string CampaignName,
    string Status,
    string? SettingsJson = null);

public interface ISurveyCampaignService
{
    Task<IReadOnlyList<SurveyCampaignDto>> ListAsync(
        string? status = null,
        CancellationToken cancellationToken = default);

    Task<SurveyCampaignDto?> GetAsync(Guid id, CancellationToken cancellationToken = default);

    Task<SurveyCampaignDto> CreateAsync(
        CreateSurveyCampaignRequest request,
        CancellationToken cancellationToken = default);

    Task<SurveyCampaignDto?> UpdateAsync(
        Guid id,
        UpdateSurveyCampaignRequest request,
        CancellationToken cancellationToken = default);

    Task<bool> ArchiveAsync(Guid id, CancellationToken cancellationToken = default);
}
