namespace PharmaCore.Application.Customers;

public sealed class CustomerImportRowRequest
{
    public int RowNumber { get; set; }
    public string CustomerCode { get; set; } = "";
    public string FullName { get; set; } = "";
    public string Phone { get; set; } = "";
    public string? Email { get; set; }
    public DateOnly? DateOfBirth { get; set; }
    public short? Gender { get; set; }
}

public sealed record CustomerImportErrorDto(int RowNumber, string Message);

public sealed record CustomerImportResultDto(
    int Created,
    int Skipped,
    int Failed,
    IReadOnlyList<CustomerImportErrorDto> Errors);
