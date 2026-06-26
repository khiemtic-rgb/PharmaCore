using PharmaCore.Application.Customers;

namespace PharmaCore.Application.CustomerApp;

public interface ICustomerAppConsentService
{
    Task<IReadOnlyList<CustomerConsentDto>> GetConsentsAsync(
        Guid tenantId,
        Guid customerId,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<CustomerConsentDto>> UpsertConsentsAsync(
        Guid tenantId,
        Guid customerId,
        UpsertCustomerConsentsRequest request,
        CancellationToken cancellationToken = default);

    Task<bool> HasGrantedConsentAsync(
        Guid tenantId,
        Guid customerId,
        short channel,
        short purpose,
        CancellationToken cancellationToken = default);

    Task<bool> CanDispatchCareReminderAsync(
        Guid tenantId,
        Guid customerId,
        CancellationToken cancellationToken = default);
}
