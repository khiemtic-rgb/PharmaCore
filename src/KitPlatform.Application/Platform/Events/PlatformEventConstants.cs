namespace KitPlatform.Application.Platform.Events;

public static class PlatformEventTypes
{
    public const string SalesOrderCompleted = "sales.order.completed.v1";
    public const string SalesReturnCompleted = "sales.return.completed.v1";
    public const string CustomerConsentUpdated = "customer.consent.updated.v1";
    public const string AssessmentSubmissionCompleted = "assessment.submission.completed.v1";
    public const string AssessmentSubmissionLeadCaptured = "assessment.submission.lead_captured.v1";

    // Healthcare network (Rx-2+) — migration 103
    public const string HealthcarePrescriberLinkActive = "healthcare.prescriber.link.active.v1";
    public const string HealthcarePrescriptionSigned = "healthcare.prescription.signed.v1";
    public const string HealthcarePrescriptionDispensed = "healthcare.prescription.dispensed.v1";
    public const string HealthcareConsultRequested = "healthcare.consult.requested.v1";
}

public static class PlatformEventAggregateTypes
{
    public const string SalesOrder = "sales_order";
    public const string SalesReturn = "sales_return";
    public const string CustomerConsent = "customer_consent";
    public const string AssessmentSubmission = "assessment_submission";
    public const string PrescriberTenantLink = "prescriber_tenant_link";
    public const string ElectronicPrescription = "electronic_prescription";
    public const string CareConsult = "care_consult";
}

public static class PlatformEventSources
{
    public const string PharmacyPack = "pack:pharmacy";
    public const string AssessmentEngine = "platform:assessment";
    public const string HealthcareNetwork = "platform:healthcare";
}
