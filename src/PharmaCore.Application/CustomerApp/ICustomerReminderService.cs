namespace PharmaCore.Application.CustomerApp;

public interface ICustomerReminderService
{
    Task<MedicationReminderListResult> ListAsync(
        Guid tenantId,
        Guid customerId,
        bool includeInactive,
        CancellationToken cancellationToken = default);

    Task<MedicationReminderDto?> GetAsync(
        Guid tenantId,
        Guid customerId,
        Guid reminderId,
        CancellationToken cancellationToken = default);

    Task<MedicationReminderDto> CreateAsync(
        Guid tenantId,
        Guid customerId,
        CreateMedicationReminderRequest request,
        CancellationToken cancellationToken = default);

    Task<MedicationReminderDto?> UpdateAsync(
        Guid tenantId,
        Guid customerId,
        Guid reminderId,
        UpdateMedicationReminderRequest request,
        CancellationToken cancellationToken = default);

    Task<bool> DeactivateAsync(
        Guid tenantId,
        Guid customerId,
        Guid reminderId,
        CancellationToken cancellationToken = default);
}
