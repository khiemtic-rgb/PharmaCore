using KitPlatform.Packs.Pharmacy.Infrastructure.CustomerApp;
using KitPlatform.Packs.Pharmacy.Care;

namespace KitPlatform.Packs.Pharmacy.Infrastructure.Care;

internal sealed class AiCareContextProvider : IAiCareContextProvider
{
    private readonly CustomerActiveMedicationRepository _repo;

    public AiCareContextProvider(CustomerActiveMedicationRepository repo) => _repo = repo;

    public async Task<AiCareMedicationContextDto> GetMedicationContextAsync(
        Guid tenantId,
        Guid customerId,
        CancellationToken cancellationToken = default)
    {
        var reminders = await _repo.ListActiveRemindersAsync(tenantId, customerId, cancellationToken);
        var orders = await _repo.ListLatestOrderLinesAsync(tenantId, customerId, cancellationToken);

        return new AiCareMedicationContextDto(
            reminders.Select(r => new AiCareReminderDto(
                r.ProductId,
                r.ProductName,
                r.DosageNote,
                r.RemindTime)).ToList(),
            orders.Select(o => new AiCareOrderLineDto(
                o.ProductId,
                o.ProductName,
                o.OrderNumber,
                o.OrderDate,
                o.SupplyEndDate)).ToList());
    }
}
