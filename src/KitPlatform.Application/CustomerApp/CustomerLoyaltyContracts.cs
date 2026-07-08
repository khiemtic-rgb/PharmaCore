namespace KitPlatform.Application.CustomerApp;

public sealed record LoyaltyTierDto(
    string TierCode,
    string TierName,
    int MinPoints,
    decimal DiscountPercent);

public sealed record LoyaltyProgramSummaryDto(
    Guid ProgramId,
    string ProgramCode,
    string ProgramName,
    decimal PointsBalance,
    decimal LifetimePoints,
    LoyaltyTierDto? CurrentTier,
    LoyaltyTierDto? NextTier);

public sealed record CustomerLoyaltySummaryDto(IReadOnlyList<LoyaltyProgramSummaryDto> Programs);

public enum LoyaltyTransactionType
{
    Earn = 1,
    Redeem = 2,
    Expire = 3,
    Adjust = 4,
}

public sealed record LoyaltyTransactionDto(
    Guid Id,
    Guid ProgramId,
    string ProgramCode,
    LoyaltyTransactionType TransactionType,
    decimal Points,
    Guid? SalesOrderId,
    string? Notes,
    DateTimeOffset CreatedAt);

public sealed record PagedLoyaltyTransactionsResult(
    IReadOnlyList<LoyaltyTransactionDto> Items,
    int Total,
    int Page,
    int PageSize);

public sealed record LoyaltyProgramCatalogDto(
    Guid ProgramId,
    string ProgramCode,
    string ProgramName,
    decimal PointsPerAmount,
    decimal AmountPerPoint,
    IReadOnlyList<LoyaltyTierDto> Tiers,
    bool IsEnrolled,
    decimal? PointsBalance,
    decimal? LifetimePoints);

public sealed record LoyaltyProgramCatalogResult(IReadOnlyList<LoyaltyProgramCatalogDto> Programs);

public enum VoucherDiscountType
{
    Percent = 1,
    Fixed = 2,
}

public sealed record CustomerVoucherDto(
    Guid CustomerVoucherId,
    Guid VoucherId,
    string VoucherCode,
    string VoucherName,
    VoucherDiscountType DiscountType,
    decimal DiscountValue,
    decimal MinOrderAmount,
    DateTimeOffset ValidFrom,
    DateTimeOffset ValidTo,
    DateTimeOffset IssuedAt,
    DateTimeOffset? UsedAt,
    bool IsUsed,
    bool IsExpired);

public sealed record CustomerVoucherListResult(IReadOnlyList<CustomerVoucherDto> Items);
