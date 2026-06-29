namespace PharmaCore.Application.CustomerApp;

public sealed record CustomerReceivableLineDto(
    Guid SalesOrderId,
    string OrderNumber,
    DateTimeOffset OrderDate,
    decimal OrderTotal,
    decimal AmountPaid,
    decimal Outstanding);

public sealed record CustomerReceivablesSummaryDto(
    decimal TotalReceivable,
    int OpenOrderCount,
    IReadOnlyList<CustomerReceivableLineDto> Lines);

public interface ICustomerAppReceivablesService
{
    Task<CustomerReceivablesSummaryDto> GetSummaryAsync(
        Guid tenantId,
        Guid customerId,
        CancellationToken cancellationToken = default);

    Task<CustomerPurchaseDetailDto?> GetOrderAsync(
        Guid tenantId,
        Guid customerId,
        Guid salesOrderId,
        CancellationToken cancellationToken = default);
}
