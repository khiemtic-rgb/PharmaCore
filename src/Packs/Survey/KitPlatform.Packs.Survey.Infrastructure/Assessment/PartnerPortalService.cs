using KitPlatform.Packs.Survey;

namespace KitPlatform.Packs.Survey.Infrastructure;

internal sealed class PartnerPortalService : IPartnerPortalService
{
    private readonly AssessmentPartnerRepository _repo;

    public PartnerPortalService(AssessmentPartnerRepository repo) => _repo = repo;

    public async Task<PartnerPortalDashboardDto> GetDashboardAsync(
        Guid partnerId,
        CancellationToken cancellationToken = default)
    {
        var statsMap = await _repo.GetStatsByPartnerIdsAsync([partnerId], cancellationToken);
        statsMap.TryGetValue(partnerId, out var s);
        var recent = await _repo.ListLeadsForPartnerAsync(partnerId, 20, cancellationToken);

        return new PartnerPortalDashboardDto(
            s?.SubmissionCount ?? 0,
            s?.CompletedCount ?? 0,
            s?.LeadCount ?? 0,
            s?.DemoScheduledCount ?? 0,
            s?.WonCount ?? 0,
            s?.PendingCommissionCount ?? 0,
            recent);
    }

    public Task<IReadOnlyList<PartnerPortalLeadItemDto>> ListLeadsAsync(
        Guid partnerId,
        CancellationToken cancellationToken = default) =>
        _repo.ListLeadsForPartnerAsync(partnerId, 100, cancellationToken);
}
