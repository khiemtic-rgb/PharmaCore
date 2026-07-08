namespace KitPlatform.Application.Core;

/// <summary>
/// Catalog BR-ID (EA Layer 6). Rules đã chạy trong code pilot — định danh để không mất khi refactor.
/// Chi tiết: docs/novixa/03-solution/enterprise-architecture-gap-matrix-v1.md §8.3
/// </summary>
public static class BusinessRuleIds
{
    public const string InvFefoAllocation = "BR-INV-001";
    public const string InvInsufficientStock = "BR-INV-002";
    public const string InvMovementsTruth = "BR-INV-003";

    public const string PrcLineAndOrderDiscount = "BR-PRC-001";
    public const string PrcDiscountPermissionLimits = "BR-PRC-002";
    public const string PrcDiscountUnauthorizedReject = "BR-PRC-003";

    public const string LoyMaxRedeemPercent = "BR-LOY-001";

    public const string CareAdherenceResponses = "BR-CARE-001";
    public const string CareRepurchaseFromSupplyEnd = "BR-CARE-002";

    public const string AiQuestionLength = "BR-AI-001";
    public const string AiDrugProfileKnowledge = "BR-AI-002";

    public const string IdTenantIsolation = "BR-ID-001";
    public const string SecPermissionPolicy = "BR-SEC-001";
}
