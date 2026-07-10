namespace KitPlatform.Packs.Survey;

// --- Partner admin / portal DTOs ---

public sealed record KapPartnerListItemDto(
    Guid Id,
    string Code,
    string Name,
    string PartnerType,
    string? Phone,
    string? Email,
    string Status,
    decimal? CommissionRatePct,
    DateTimeOffset CreatedAt,
    DateTimeOffset? LastLoginAt,
    int SubmissionCount,
    int LeadCount);

public sealed record KapPartnerDetailDto(
    Guid Id,
    string Code,
    string Name,
    string PartnerType,
    string? Phone,
    string? Email,
    string Status,
    decimal? CommissionRatePct,
    string? Notes,
    DateTimeOffset CreatedAt,
    DateTimeOffset? LastLoginAt,
    string ReferralUrl,
    int SubmissionCount,
    int LeadCount,
    int CompletedCount);

public sealed record CreateKapPartnerRequest(
    string Code,
    string Name,
    string PartnerType,
    string Password,
    string? Phone,
    string? Email,
    decimal? CommissionRatePct,
    string? Notes);

public sealed record UpdateKapPartnerRequest(
    string Name,
    string PartnerType,
    string? Phone,
    string? Email,
    string Status,
    decimal? CommissionRatePct,
    string? Notes,
    string? NewPassword);

public sealed record PartnerPortalLoginRequest(string Login, string Password);

public sealed record PartnerPortalLoginResult(
    string AccessToken,
    DateTimeOffset ExpiresAt,
    PartnerPortalMeDto Partner);

public sealed record PartnerPortalMeDto(
    Guid Id,
    string Code,
    string Name,
    string PartnerType,
    string? Phone,
    string? Email,
    string ReferralUrl,
    string QrUrl);

public sealed record PartnerPortalDashboardDto(
    int SubmissionCount,
    int CompletedCount,
    int LeadCount,
    int DemoScheduledCount,
    int WonCount,
    int PendingCommissionCount,
    IReadOnlyList<PartnerPortalLeadItemDto> RecentLeads);

public sealed record PartnerPortalLeadItemDto(
    Guid Id,
    string Status,
    string? OrgName,
    string? ContactName,
    string? Phone,
    decimal? OverallPct,
    string LeadPipelineStatus,
    string CommissionStatus,
    DateTimeOffset StartedAt,
    DateTimeOffset? LeadCapturedAt);

public sealed record UpdateLeadPipelineRequest(
    string LeadPipelineStatus,
    string? CommissionStatus);

public interface IAssessmentPartnerAdminService
{
    Task<IReadOnlyList<KapPartnerListItemDto>> ListAsync(CancellationToken cancellationToken = default);

    Task<KapPartnerDetailDto?> GetAsync(Guid id, CancellationToken cancellationToken = default);

    Task<KapPartnerDetailDto> CreateAsync(CreateKapPartnerRequest request, CancellationToken cancellationToken = default);

    Task<KapPartnerDetailDto?> UpdateAsync(Guid id, UpdateKapPartnerRequest request, CancellationToken cancellationToken = default);
}

public interface IPartnerPortalAuthService
{
    Task<PartnerPortalLoginResult> LoginAsync(PartnerPortalLoginRequest request, CancellationToken cancellationToken = default);

    Task<PartnerPortalMeDto> GetMeAsync(Guid partnerId, CancellationToken cancellationToken = default);
}

public interface IPartnerPortalService
{
    Task<PartnerPortalDashboardDto> GetDashboardAsync(Guid partnerId, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<PartnerPortalLeadItemDto>> ListLeadsAsync(
        Guid partnerId,
        CancellationToken cancellationToken = default);
}
