namespace KitPlatform.Packs.Pharmacy.Inventory;

public interface IInventoryImportService
{
    Task<OpeningBalanceImportResultDto> ImportOpeningBalanceAsync(
        Guid warehouseId,
        string? notes,
        IReadOnlyList<OpeningBalanceImportRowRequest> rows,
        CancellationToken cancellationToken = default);
}
