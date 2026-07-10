namespace KitPlatform.Application.Healthcare;

/// <summary>
/// E-prescription issuance from prescriber channel — platform contract (Rx-2 Phase A).
/// Clinic / telehealth (Phase 2) calls the same service with <see cref="HealthcareIssuanceChannels.Telehealth"/>
/// and optional <c>careEpisodeId</c>.
/// </summary>
public interface IPrescriptionIssuanceService
{
    Task<PortalPrescriptionSummary> CreateSignedPrescriptionAsync(
        Guid prescriberId,
        CreatePortalPrescriptionRequest request,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<PortalPrescriptionSummary>> ListMyPrescriptionsAsync(
        Guid prescriberId,
        Guid? tenantId = null,
        CancellationToken cancellationToken = default);

    Task<PortalPrescriptionSummary?> GetPrescriptionAsync(
        Guid prescriberId,
        Guid prescriptionId,
        CancellationToken cancellationToken = default);
}
