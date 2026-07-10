namespace KitPlatform.Application.Healthcare;

/// <summary>
/// N-N prescriber ↔ pharmacy network — platform contract; Pharmacy pack implements (Rx-2 Phase A).
/// Telehealth (Phase 2) consumes the same link spine; no schema change required.
/// </summary>
public interface IPrescriberNetworkService
{
    Task<IReadOnlyList<PrescriberPharmacyLink>> ListMyPharmaciesAsync(
        Guid prescriberId,
        bool activeOnly = true,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<PrescriberPharmacyLink>> ListPendingInvitesAsync(
        Guid prescriberId,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<PharmacyDirectoryEntry>> SearchPharmacyDirectoryAsync(
        string? query,
        CancellationToken cancellationToken = default);

    Task<PrescriberPharmacyLink> RequestPharmacyLinkAsync(
        Guid prescriberId,
        RequestPharmacyLinkRequest request,
        CancellationToken cancellationToken = default);

    Task<PrescriberPharmacyLink?> AcceptInviteAsync(
        Guid prescriberId,
        Guid linkId,
        CancellationToken cancellationToken = default);

    Task<PrescriberPharmacyLink?> DeclineInviteAsync(
        Guid prescriberId,
        Guid linkId,
        RejectPharmacyLinkRequest? request = null,
        CancellationToken cancellationToken = default);
}
