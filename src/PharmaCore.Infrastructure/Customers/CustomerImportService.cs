using PharmaCore.Application.Customers;

namespace PharmaCore.Infrastructure.Customers;

internal sealed class CustomerImportService : ICustomerImportService
{
    private readonly CustomerAdminRepository _repository;
    private readonly ICustomerAdminService _customers;

    public CustomerImportService(CustomerAdminRepository repository, ICustomerAdminService customers)
    {
        _repository = repository;
        _customers = customers;
    }

    public async Task<CustomerImportResultDto> ImportCustomersAsync(
        IReadOnlyList<CustomerImportRowRequest> rows,
        CancellationToken cancellationToken = default)
    {
        if (rows.Count == 0)
            throw new InvalidOperationException("Không có dòng dữ liệu để import.");

        var created = 0;
        var skipped = 0;
        var errors = new List<CustomerImportErrorDto>();

        foreach (var row in rows)
        {
            try
            {
                var code = row.CustomerCode?.Trim() ?? "";
                var name = row.FullName?.Trim() ?? "";
                var phone = row.Phone?.Trim() ?? "";

                if (code.Length == 0)
                {
                    errors.Add(new CustomerImportErrorDto(row.RowNumber, "Thiếu mã khách hàng."));
                    continue;
                }

                if (name.Length < 2)
                {
                    errors.Add(new CustomerImportErrorDto(row.RowNumber, "Tên khách hàng quá ngắn."));
                    continue;
                }

                if (phone.Length == 0)
                {
                    errors.Add(new CustomerImportErrorDto(row.RowNumber, "Thiếu số điện thoại."));
                    continue;
                }

                if (await _repository.CustomerCodeExistsAsync(code, excludeCustomerId: null, cancellationToken))
                {
                    skipped++;
                    continue;
                }

                if (await _repository.PhoneExistsAsync(phone, excludeCustomerId: null, cancellationToken))
                {
                    skipped++;
                    continue;
                }

                await _customers.CreateAsync(
                    new CreateCustomerRequest(
                        name,
                        phone,
                        code,
                        string.IsNullOrWhiteSpace(row.Email) ? null : row.Email.Trim(),
                        row.DateOfBirth,
                        row.Gender),
                    cancellationToken);

                created++;
            }
            catch (Exception ex)
            {
                errors.Add(new CustomerImportErrorDto(row.RowNumber, ex.Message));
            }
        }

        return new CustomerImportResultDto(created, skipped, errors.Count, errors);
    }
}
