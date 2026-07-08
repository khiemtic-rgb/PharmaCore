namespace KitPlatform.Application.Loyalty;

public sealed record LoyaltyTierAdminDto(
    Guid? Id,
    string TierCode,
    string TierName,
    int MinPoints,
    decimal DiscountPercent,
    int SortOrder);

public sealed record LoyaltyProgramAdminDto(
    Guid? Id,
    string ProgramCode,
    string ProgramName,
    decimal PointsPerAmount,
    decimal AmountPerPoint,
    decimal MaxRedeemPercent,
    short Status,
    IReadOnlyList<LoyaltyTierAdminDto> Tiers);

public sealed record LoyaltyAdminSettingsDto(
    bool LoyaltyEnabled,
    LoyaltyProgramAdminDto? Program);

public sealed record UpdateLoyaltyAdminSettingsRequest(
    bool LoyaltyEnabled,
    LoyaltyProgramAdminDto Program);
