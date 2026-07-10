namespace KitPlatform.Application.Healthcare;

public sealed record PrescriberOtpRequest(string Phone);

public sealed record PrescriberOtpVerifyRequest(string Phone, string Code);

public sealed record PrescriberOtpSentResponse(
    int ExpiresInSeconds,
    int CooldownSeconds,
    string Message,
    string? PilotCode = null);

public sealed record PrescriberLoginResponse(
    string AccessToken,
    DateTimeOffset ExpiresAt,
    PrescriberProfile Profile);

public sealed record PrescriberProfile(
    Guid Id,
    string FullName,
    string? LicenseNumber,
    string Phone,
    string? Specialty,
    string Status);

public sealed record PrescriberPharmacyLink(
    Guid Id,
    Guid PrescriberId,
    Guid TenantId,
    string TenantCode,
    string TenantName,
    Guid? LinkedPrescriberId,
    string LinkStatus,
    string InitiatedBy,
    DateTime InvitedAt,
    DateTime? RespondedAt,
    string? PrescriberName,
    string? PrescriberPhone,
    string? PrescriberLicenseNumber);

public sealed record PharmacyDirectoryEntry(
    Guid TenantId,
    string TenantCode,
    string TenantName,
    string? Address,
    string? Phone);

public sealed record RequestPharmacyLinkRequest(string TenantCode);

public sealed record RejectPharmacyLinkRequest(string? Reason = null);

public sealed record PortalPrescriptionLineRequest(
    Guid ProductId,
    Guid? ProductUnitId,
    decimal Quantity,
    string? DosageInstructions,
    int? DurationDays);

public sealed record CreatePortalPrescriptionRequest(
    Guid TenantId,
    Guid CustomerId,
    string? PatientName,
    string? PatientPhone,
    string? Notes,
    IReadOnlyList<PortalPrescriptionLineRequest> Lines);

public sealed record PortalPrescriptionSummary(
    Guid Id,
    Guid TenantId,
    string PrescriptionCode,
    string Status,
    string Source,
    Guid? CareEpisodeId,
    DateTimeOffset CreatedAt,
    DateTimeOffset? SignedAt);
