namespace PharmaCore.Application.CustomerApp;

public sealed record MedicationReminderDto(
    Guid Id,
    Guid ProductId,
    Guid? FamilyMemberId,
    string ProductCode,
    string ProductName,
    string? DosageNote,
    string RemindTime,
    IReadOnlyList<int> DaysOfWeek,
    DateTimeOffset? NextRemindAt,
    bool IsActive,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);

public sealed record MedicationReminderListResult(IReadOnlyList<MedicationReminderDto> Items);

public sealed record CreateMedicationReminderRequest(
    Guid ProductId,
    Guid? FamilyMemberId,
    string? DosageNote,
    string RemindTime,
    IReadOnlyList<int>? DaysOfWeek = null);

public sealed record UpdateMedicationReminderRequest(
    Guid? ProductId = null,
    Guid? FamilyMemberId = null,
    string? DosageNote = null,
    string? RemindTime = null,
    IReadOnlyList<int>? DaysOfWeek = null,
    bool? IsActive = null);
