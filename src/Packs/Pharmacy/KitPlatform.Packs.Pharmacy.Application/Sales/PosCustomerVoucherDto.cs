namespace KitPlatform.Packs.Pharmacy.Sales;

public sealed record PosCustomerVoucherDto(
    Guid CustomerVoucherId,
    Guid VoucherId,
    string VoucherCode,
    string VoucherName,
    short DiscountType,
    decimal DiscountValue,
    decimal MinOrderAmount,
    decimal DiscountAmount);

public sealed record PosCustomerVoucherListResult(IReadOnlyList<PosCustomerVoucherDto> Items);
