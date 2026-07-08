using KitPlatform.Application.CustomerApp;
using KitPlatform.Application.Customers;

namespace KitPlatform.Infrastructure.CustomerApp;

internal sealed class CustomerAppConsentService : ICustomerAppConsentService
{
    private readonly CustomerAppConsentRepository _repo;

    public CustomerAppConsentService(CustomerAppConsentRepository repo) => _repo = repo;

    public Task<IReadOnlyList<CustomerConsentDto>> GetConsentsAsync(
        Guid tenantId,
        Guid customerId,
        CancellationToken cancellationToken = default) =>
        _repo.GetConsentsAsync(tenantId, customerId, cancellationToken);

    public Task<IReadOnlyList<CustomerConsentDto>> UpsertConsentsAsync(
        Guid tenantId,
        Guid customerId,
        UpsertCustomerConsentsRequest request,
        CancellationToken cancellationToken = default) =>
        _repo.UpsertConsentsAsync(tenantId, customerId, request, cancellationToken);

    public Task<bool> HasGrantedConsentAsync(
        Guid tenantId,
        Guid customerId,
        short channel,
        short purpose,
        CancellationToken cancellationToken = default) =>
        _repo.HasGrantedConsentAsync(tenantId, customerId, channel, purpose, cancellationToken);

    public async Task<bool> CanDispatchCareReminderAsync(
        Guid tenantId,
        Guid customerId,
        CancellationToken cancellationToken = default)
    {
        if (await HasGrantedConsentAsync(
                tenantId, customerId, CustomerConsentChannels.Sms, CustomerConsentPurposes.CareReminder, cancellationToken))
        {
            return true;
        }

        return await HasGrantedConsentAsync(
            tenantId, customerId, CustomerConsentChannels.AppPush, CustomerConsentPurposes.CareReminder, cancellationToken);
    }
}
