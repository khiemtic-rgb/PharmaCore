using KitPlatform.Application.Healthcare;
using KitPlatform.Packs.Pharmacy.Rx;
using HealthcareLinkRequest = KitPlatform.Application.Healthcare.RequestPharmacyLinkRequest;
using HealthcareRejectRequest = KitPlatform.Application.Healthcare.RejectPharmacyLinkRequest;

namespace KitPlatform.Packs.Pharmacy.Infrastructure.Healthcare;

/// <summary>Platform <see cref="IPrescriberNetworkService"/> → Pharmacy pack link service (strangler adapter).</summary>
internal sealed class PrescriberNetworkHealthcareAdapter : IPrescriberNetworkService
{
    private readonly IPrescriberLinkService _inner;

    public PrescriberNetworkHealthcareAdapter(IPrescriberLinkService inner) => _inner = inner;

    public async Task<IReadOnlyList<PrescriberPharmacyLink>> ListMyPharmaciesAsync(
        Guid prescriberId,
        bool activeOnly = true,
        CancellationToken cancellationToken = default)
    {
        var rows = await _inner.ListMyPharmaciesAsync(prescriberId, activeOnly, cancellationToken);
        return rows.Select(HealthcareDtoMapper.ToLink).ToList();
    }

    public async Task<IReadOnlyList<PrescriberPharmacyLink>> ListPendingInvitesAsync(
        Guid prescriberId,
        CancellationToken cancellationToken = default)
    {
        var rows = await _inner.ListPendingInvitesAsync(prescriberId, cancellationToken);
        return rows.Select(HealthcareDtoMapper.ToLink).ToList();
    }

    public async Task<IReadOnlyList<PharmacyDirectoryEntry>> SearchPharmacyDirectoryAsync(
        string? query,
        CancellationToken cancellationToken = default)
    {
        var rows = await _inner.SearchPharmacyDirectoryAsync(query, cancellationToken);
        return rows.Select(HealthcareDtoMapper.ToDirectory).ToList();
    }

    public async Task<PrescriberPharmacyLink> RequestPharmacyLinkAsync(
        Guid prescriberId,
        HealthcareLinkRequest request,
        CancellationToken cancellationToken = default)
    {
        var row = await _inner.RequestPharmacyLinkAsync(
            prescriberId,
            new Packs.Pharmacy.Rx.RequestPharmacyLinkRequest(request.TenantCode),
            cancellationToken);
        return HealthcareDtoMapper.ToLink(row);
    }

    public async Task<PrescriberPharmacyLink?> AcceptInviteAsync(
        Guid prescriberId,
        Guid linkId,
        CancellationToken cancellationToken = default)
    {
        var row = await _inner.AcceptInviteAsync(prescriberId, linkId, cancellationToken);
        return row is null ? null : HealthcareDtoMapper.ToLink(row);
    }

    public async Task<PrescriberPharmacyLink?> DeclineInviteAsync(
        Guid prescriberId,
        Guid linkId,
        HealthcareRejectRequest? request = null,
        CancellationToken cancellationToken = default)
    {
        var row = await _inner.DeclineInviteAsync(
            prescriberId,
            linkId,
            request is null ? null : new RejectPrescriberLinkRequest(request.Reason),
            cancellationToken);
        return row is null ? null : HealthcareDtoMapper.ToLink(row);
    }
}
