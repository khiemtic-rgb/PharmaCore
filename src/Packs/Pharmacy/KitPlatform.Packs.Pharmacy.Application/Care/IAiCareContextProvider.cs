namespace KitPlatform.Packs.Pharmacy.Care;

/// <summary>Care Domain contract: medication context for AI (replaces direct repository access in AI).</summary>
public interface IAiCareContextProvider
{
    Task<AiCareMedicationContextDto> GetMedicationContextAsync(
        Guid tenantId,
        Guid customerId,
        CancellationToken cancellationToken = default);
}
