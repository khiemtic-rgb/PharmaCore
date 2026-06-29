using PharmaCore.Application.CustomerApp;

namespace PharmaCore.Infrastructure.CustomerApp;

internal sealed class CustomerAppReceivablesService : ICustomerAppReceivablesService
{
    private readonly CustomerReceivablesRepository _receivables;
    private readonly CustomerPurchaseRepository _purchases;

    public CustomerAppReceivablesService(
        CustomerReceivablesRepository receivables,
        CustomerPurchaseRepository purchases)
    {
        _receivables = receivables;
        _purchases = purchases;
    }

    public async Task<CustomerReceivablesSummaryDto> GetSummaryAsync(
        Guid tenantId,
        Guid customerId,
        CancellationToken cancellationToken = default)
    {
        var lines = await _receivables.ListOpenOrdersAsync(tenantId, customerId, cancellationToken);
        var total = lines.Sum(x => x.Outstanding);
        return new CustomerReceivablesSummaryDto(total, lines.Count, lines);
    }

    public async Task<CustomerPurchaseDetailDto?> GetOrderAsync(
        Guid tenantId,
        Guid customerId,
        Guid salesOrderId,
        CancellationToken cancellationToken = default)
    {
        var order = await _purchases.GetAsync(tenantId, customerId, salesOrderId, cancellationToken);
        if (order is null || order.Outstanding <= 0.009m)
            return null;

        return order;
    }
}
