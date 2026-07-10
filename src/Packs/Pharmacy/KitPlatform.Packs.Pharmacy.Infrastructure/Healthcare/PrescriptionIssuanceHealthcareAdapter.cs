using KitPlatform.Application.Healthcare;
using KitPlatform.Packs.Pharmacy.Rx;

namespace KitPlatform.Packs.Pharmacy.Infrastructure.Healthcare;

internal sealed class PrescriptionIssuanceHealthcareAdapter : IPrescriptionIssuanceService
{
    private readonly IPrescriberPortalPrescriptionService _portal;

    public PrescriptionIssuanceHealthcareAdapter(IPrescriberPortalPrescriptionService portal) => _portal = portal;

    public async Task<PortalPrescriptionSummary> CreateSignedPrescriptionAsync(
        Guid prescriberId,
        CreatePortalPrescriptionRequest request,
        CancellationToken cancellationToken = default)
    {
        var detail = await _portal.CreateSignedPrescriptionAsync(
            prescriberId,
            new PortalCreatePrescriptionRequest(
                request.TenantId,
                request.CustomerId,
                request.PatientName,
                request.PatientPhone,
                request.Notes,
                request.Lines.Select(l => new PortalCreatePrescriptionLineRequest(
                    l.ProductId,
                    l.ProductUnitId,
                    l.Quantity,
                    l.DosageInstructions,
                    0)).ToList()),
            cancellationToken);

        return ToSummary(detail);
    }

    public async Task<IReadOnlyList<PortalPrescriptionSummary>> ListMyPrescriptionsAsync(
        Guid prescriberId,
        Guid? tenantId = null,
        CancellationToken cancellationToken = default)
    {
        var rows = await _portal.ListMyPrescriptionsAsync(prescriberId, tenantId, cancellationToken);
        return rows.Select(r => new PortalPrescriptionSummary(
            r.Id,
            r.TenantId,
            r.PrescriptionCode,
            r.Status,
            r.Source,
            null,
            r.CreatedAt,
            r.SignedAt)).ToList();
    }

    public async Task<PortalPrescriptionSummary?> GetPrescriptionAsync(
        Guid prescriberId,
        Guid prescriptionId,
        CancellationToken cancellationToken = default)
    {
        var detail = await _portal.GetPrescriptionAsync(prescriberId, prescriptionId, cancellationToken);
        return detail is null ? null : ToSummary(detail);
    }

    private static PortalPrescriptionSummary ToSummary(PortalPrescriptionDetailDto detail) =>
        new(
            detail.Id,
            detail.TenantId,
            detail.PrescriptionCode,
            detail.Status,
            detail.Source,
            null,
            detail.CreatedAt,
            detail.SignedAt);

    private static PortalPrescriptionSummary ToSummary(PortalPrescriptionSummaryDto row) =>
        new(
            row.Id,
            row.TenantId,
            row.PrescriptionCode,
            row.Status,
            row.Source,
            null,
            row.CreatedAt,
            row.SignedAt);
}
