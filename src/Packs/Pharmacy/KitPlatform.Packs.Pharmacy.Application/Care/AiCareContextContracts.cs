namespace KitPlatform.Packs.Pharmacy.Care;

/// <summary>Care context for AI Copilot — no SQL in AI layer (NSF-CARE, NSF-AI).</summary>
public sealed record AiCareReminderDto(
    Guid ProductId,
    string ProductName,
    string? DosageNote,
    TimeOnly RemindTime);

public sealed record AiCareOrderLineDto(
    Guid ProductId,
    string ProductName,
    string OrderNumber,
    DateTime OrderDate,
    DateOnly SupplyEndDate);

public sealed record AiCareMedicationContextDto(
    IReadOnlyList<AiCareReminderDto> Reminders,
    IReadOnlyList<AiCareOrderLineDto> Orders);

public sealed record CareProductSummaryDto(
    Guid Id,
    string ProductName,
    string? GenericName);
