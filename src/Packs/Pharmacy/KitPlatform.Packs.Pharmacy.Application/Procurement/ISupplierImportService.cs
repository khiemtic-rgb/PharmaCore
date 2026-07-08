namespace KitPlatform.Packs.Pharmacy.Procurement;

public interface ISupplierImportService
{
    Task<SupplierImportResultDto> ImportSuppliersAsync(
        IReadOnlyList<SupplierImportRowRequest> rows,
        CancellationToken cancellationToken = default);
}
