namespace KitPlatform.Packs.Pharmacy.Rx;

public interface IPrescriberLinkService
{
    // Admin (tenant-scoped)
    Task<IReadOnlyList<PrescriberTenantLinkDto>> ListTenantLinksAsync(
        string? status = null,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<PrescriberTenantLinkDto>> ListPendingApprovalAsync(
        CancellationToken cancellationToken = default);

    Task<PrescriberTenantLinkDto> InvitePrescriberAsync(
        InvitePrescriberLinkRequest request,
        CancellationToken cancellationToken = default);

    Task<PrescriberTenantLinkDto?> ApproveLinkAsync(
        Guid linkId,
        CancellationToken cancellationToken = default);

    Task<PrescriberTenantLinkDto?> RejectLinkAsync(
        Guid linkId,
        RejectPrescriberLinkRequest? request = null,
        CancellationToken cancellationToken = default);

    Task<PrescriberTenantLinkDto?> RevokeLinkAsync(
        Guid linkId,
        CancellationToken cancellationToken = default);

    // Portal (prescriber-scoped)
    Task<IReadOnlyList<PrescriberTenantLinkDto>> ListMyPharmaciesAsync(
        Guid prescriberId,
        bool activeOnly = true,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<PrescriberTenantLinkDto>> ListPendingInvitesAsync(
        Guid prescriberId,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<PharmacyDirectoryItemDto>> SearchPharmacyDirectoryAsync(
        string? query,
        CancellationToken cancellationToken = default);

    Task<PrescriberTenantLinkDto> RequestPharmacyLinkAsync(
        Guid prescriberId,
        RequestPharmacyLinkRequest request,
        CancellationToken cancellationToken = default);

    Task<PrescriberTenantLinkDto?> AcceptInviteAsync(
        Guid prescriberId,
        Guid linkId,
        CancellationToken cancellationToken = default);

    Task<PrescriberTenantLinkDto?> DeclineInviteAsync(
        Guid prescriberId,
        Guid linkId,
        RejectPrescriberLinkRequest? request = null,
        CancellationToken cancellationToken = default);
}
