namespace KitPlatform.Application.Loyalty;

public static class VoucherStatuses
{
    public const short Active = 1;
    public const short Inactive = 0;
}

public sealed record VoucherAdminDto(
    Guid Id,
    string VoucherCode,
    string VoucherName,
    short DiscountType,
    decimal DiscountValue,
    decimal MinOrderAmount,
    int? MaxUses,
    int UsedCount,
    DateTimeOffset ValidFrom,
    DateTimeOffset ValidTo,
    short Status,
    int IssuedCount);

public sealed record VoucherListResult(IReadOnlyList<VoucherAdminDto> Items);

public sealed record UpsertVoucherRequest(
    string VoucherCode,
    string VoucherName,
    short DiscountType,
    decimal DiscountValue,
    decimal MinOrderAmount,
    int? MaxUses,
    DateTimeOffset ValidFrom,
    DateTimeOffset ValidTo,
    short Status);

public sealed record IssueVoucherRequest(Guid CustomerId);

public sealed record IssueVoucherBulkRequest(IReadOnlyList<Guid> CustomerIds);

public sealed record IssueVoucherBulkResult(
    int IssuedCount,
    int SkippedAlreadyHad,
    int InvalidCount);

public sealed record VoucherIssueCandidateSearchRequest(
    string? Search,
    bool RevenueEnabled,
    DateTimeOffset? RevenueFrom,
    DateTimeOffset? RevenueTo,
    decimal? MinRevenue,
    bool BirthdayEnabled,
    int? BirthdayFromMonth,
    int? BirthdayFromDay,
    int? BirthdayToMonth,
    int? BirthdayToDay,
    bool TierEnabled,
    IReadOnlyList<Guid>? TierIds,
    bool ExcludeAlreadyIssued,
    int Page = 1,
    int PageSize = 50);

public sealed record VoucherIssueCandidateDto(
    Guid Id,
    string CustomerCode,
    string FullName,
    string Phone,
    string? TierName,
    decimal? PeriodRevenue,
    DateOnly? DateOfBirth,
    bool AlreadyIssued);

public sealed record VoucherIssueCandidateListResult(
    IReadOnlyList<VoucherIssueCandidateDto> Items,
    int Total,
    int Page,
    int PageSize);

public sealed record IssuedCustomerVoucherDto(
    Guid CustomerVoucherId,
    Guid CustomerId,
    string CustomerName,
    string? CustomerPhone,
    DateTimeOffset IssuedAt,
    DateTimeOffset? UsedAt);

public sealed record IssuedCustomerVoucherListResult(IReadOnlyList<IssuedCustomerVoucherDto> Items);
