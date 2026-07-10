namespace KitPlatform.Application.Healthcare;

/// <summary>
/// Cross-pack healthcare network constants (Rx-2 / Healthcare Operating Platform spine).
/// </summary>
public static class HealthcareLinkStatuses
{
    public const string PendingNtInvite = "pending_nt_invite";
    public const string PendingNtApproval = "pending_nt_approval";
    public const string Active = "active";
    public const string Rejected = "rejected";
    public const string Revoked = "revoked";
}

/// <summary>
/// Prescription issuance channel — maps to <c>electronic_prescriptions.source</c> (migration 103+).
/// </summary>
public static class HealthcareIssuanceChannels
{
    public const string StaffEntry = "staff_entry";
    public const string PrescriberPortal = "prescriber_portal";
    public const string CustomerUpload = "customer_upload";
    public const string Telehealth = "telehealth";
}

public static class HealthcarePrescriberStatuses
{
    public const string PendingVerification = "pending_verification";
    public const string Active = "active";
    public const string Suspended = "suspended";
}
