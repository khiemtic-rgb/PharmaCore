namespace PharmaCore.Application.Sales;

public sealed record PosCustomerLoyaltyDto(
    bool LoyaltyEnabled,
    decimal PointsBalance,
    decimal AmountPerPoint,
    decimal PointsPerAmount,
    decimal MaxRedeemPercent,
    decimal MaxRedeemDiscountAmount,
    int MaxRedeemPoints);
