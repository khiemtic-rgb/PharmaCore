namespace KitPlatform.Packs.Pharmacy;

public sealed record PharmacyDispensingNoteDto(
    Guid Id,
    Guid SalesOrderId,
    Guid? CustomerId,
    string NoteType,
    string? NoteText,
    DateTime CreatedAt);

public sealed record CreatePharmacyDispensingNoteRequest(
    Guid SalesOrderId,
    Guid? CustomerId,
    string NoteType = "counseling",
    string? NoteText = null);

public interface IPharmacyDispensingNoteService
{
    Task<IReadOnlyList<PharmacyDispensingNoteDto>> ListBySalesOrderAsync(
        Guid salesOrderId,
        CancellationToken cancellationToken = default);

    Task<PharmacyDispensingNoteDto> CreateAsync(
        CreatePharmacyDispensingNoteRequest request,
        CancellationToken cancellationToken = default);
}
