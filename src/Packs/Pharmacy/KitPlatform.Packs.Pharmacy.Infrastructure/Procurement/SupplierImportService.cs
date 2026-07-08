using KitPlatform.Packs.Pharmacy.Procurement;

namespace KitPlatform.Packs.Pharmacy.Infrastructure;

internal sealed class SupplierImportService : ISupplierImportService
{
    private readonly ProcurementRepository _repository;
    private readonly ISupplierService _suppliers;

    public SupplierImportService(ProcurementRepository repository, ISupplierService suppliers)
    {
        _repository = repository;
        _suppliers = suppliers;
    }

    public async Task<SupplierImportResultDto> ImportSuppliersAsync(
        IReadOnlyList<SupplierImportRowRequest> rows,
        CancellationToken cancellationToken = default)
    {
        if (rows.Count == 0)
            throw new InvalidOperationException("Không có dòng dữ liệu để import.");

        var created = 0;
        var skipped = 0;
        var errors = new List<SupplierImportErrorDto>();

        foreach (var row in rows)
        {
            try
            {
                var code = row.SupplierCode?.Trim() ?? "";
                var name = row.SupplierName?.Trim() ?? "";
                if (code.Length == 0)
                {
                    errors.Add(new SupplierImportErrorDto(row.RowNumber, "Thiếu mã NCC."));
                    continue;
                }
                if (name.Length < 2)
                {
                    errors.Add(new SupplierImportErrorDto(row.RowNumber, "Tên NCC quá ngắn."));
                    continue;
                }

                if (await _repository.SupplierCodeExistsAsync(code, cancellationToken))
                {
                    skipped++;
                    continue;
                }

                await _suppliers.CreateAsync(
                    new CreateSupplierRequest(
                        code,
                        name,
                        string.IsNullOrWhiteSpace(row.TaxCode) ? null : row.TaxCode.Trim(),
                        string.IsNullOrWhiteSpace(row.ContactName) ? null : row.ContactName.Trim(),
                        string.IsNullOrWhiteSpace(row.Phone) ? null : row.Phone.Trim(),
                        string.IsNullOrWhiteSpace(row.Email) ? null : row.Email.Trim(),
                        string.IsNullOrWhiteSpace(row.Address) ? null : row.Address.Trim(),
                        row.PaymentTerms > 0 ? row.PaymentTerms : 30),
                    cancellationToken);

                created++;
            }
            catch (Exception ex)
            {
                errors.Add(new SupplierImportErrorDto(row.RowNumber, ex.Message));
            }
        }

        return new SupplierImportResultDto(created, skipped, errors.Count, errors);
    }
}
