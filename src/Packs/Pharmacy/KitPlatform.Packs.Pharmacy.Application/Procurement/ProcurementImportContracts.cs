namespace KitPlatform.Packs.Pharmacy.Procurement;

public sealed class SupplierImportRowRequest
{
    public int RowNumber { get; init; }
    public required string SupplierCode { get; init; }
    public required string SupplierName { get; init; }
    public string? TaxCode { get; init; }
    public string? ContactName { get; init; }
    public string? Phone { get; init; }
    public string? Email { get; init; }
    public string? Address { get; init; }
    public int PaymentTerms { get; init; } = 30;
}

public sealed record SupplierImportErrorDto(int RowNumber, string Message);

public sealed record SupplierImportResultDto(
    int Created,
    int Skipped,
    int Failed,
    IReadOnlyList<SupplierImportErrorDto> Errors);
