namespace PharmaCore.Application.Customers;

public interface ICustomerImportService
{
    Task<CustomerImportResultDto> ImportCustomersAsync(
        IReadOnlyList<CustomerImportRowRequest> rows,
        CancellationToken cancellationToken = default);
}
