namespace KitPlatform.Packs.Clinic;

public sealed record ClinicAppointmentDto(
    Guid Id,
    Guid CustomerId,
    Guid? ProviderId,
    Guid? BranchId,
    DateTimeOffset AppointmentAt,
    int DurationMinutes,
    string AppointmentStatus,
    string? Reason,
    string? Notes,
    DateTimeOffset CreatedAt);

public sealed record CreateClinicAppointmentRequest(
    Guid CustomerId,
    Guid? ProviderId,
    Guid? BranchId,
    DateTimeOffset AppointmentAt,
    int DurationMinutes = 30,
    string? Reason = null,
    string? Notes = null);

public sealed record CrmLeadDto(
    Guid Id,
    string LeadCode,
    string FullName,
    string? Phone,
    string? Email,
    string LeadStatus,
    string Source,
    DateTimeOffset CreatedAt);

public sealed record CreateCrmLeadRequest(
    string LeadCode,
    string FullName,
    string? Phone = null,
    string? Email = null,
    string Source = "walk_in",
    Guid? CustomerId = null,
    string? Notes = null);

public interface IClinicAppointmentService
{
    Task<IReadOnlyList<ClinicAppointmentDto>> ListAsync(
        DateTimeOffset? from,
        DateTimeOffset? to,
        CancellationToken cancellationToken = default);

    Task<ClinicAppointmentDto> CreateAsync(
        CreateClinicAppointmentRequest request,
        CancellationToken cancellationToken = default);
}

public interface ICrmLeadService
{
    Task<IReadOnlyList<CrmLeadDto>> ListAsync(
        string? status,
        CancellationToken cancellationToken = default);

    Task<CrmLeadDto> CreateAsync(
        CreateCrmLeadRequest request,
        CancellationToken cancellationToken = default);
}

public sealed record ClinicVisitDto(
    Guid Id,
    Guid? AppointmentId,
    Guid CustomerId,
    Guid? ProviderId,
    string VisitStatus,
    string? ChiefComplaint,
    string? DiagnosisSummary,
    DateTimeOffset StartedAt,
    DateTimeOffset? ClosedAt,
    DateTimeOffset CreatedAt);

public sealed record CreateClinicVisitRequest(
    Guid CustomerId,
    Guid? AppointmentId = null,
    Guid? ProviderId = null,
    string? ChiefComplaint = null);

public sealed record UpdateClinicVisitRequest(
    string? ChiefComplaint = null,
    string? DiagnosisSummary = null,
    string? VisitStatus = null);

public sealed record ClinicVisitNoteDto(
    Guid Id,
    Guid VisitId,
    string NoteType,
    string NoteBody,
    Guid? AuthorUserId,
    DateTimeOffset CreatedAt);

public sealed record CreateClinicVisitNoteRequest(
    string NoteBody,
    string NoteType = "clinical");

public interface IClinicVisitService
{
    Task<IReadOnlyList<ClinicVisitDto>> ListAsync(
        Guid? customerId,
        string? status,
        DateTimeOffset? from,
        DateTimeOffset? to,
        CancellationToken cancellationToken = default);

    Task<ClinicVisitDto?> GetAsync(Guid visitId, CancellationToken cancellationToken = default);

    Task<ClinicVisitDto> CreateAsync(
        CreateClinicVisitRequest request,
        CancellationToken cancellationToken = default);

    Task<ClinicVisitDto?> UpdateAsync(
        Guid visitId,
        UpdateClinicVisitRequest request,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<ClinicVisitNoteDto>> ListNotesAsync(
        Guid visitId,
        CancellationToken cancellationToken = default);

    Task<ClinicVisitNoteDto> AddNoteAsync(
        Guid visitId,
        CreateClinicVisitNoteRequest request,
        CancellationToken cancellationToken = default);
}
