using KitPlatform.Application.CustomerApp;

namespace KitPlatform.Infrastructure.CustomerApp;

internal sealed class CustomerLoyaltyService : ICustomerLoyaltyService
{
    private readonly CustomerLoyaltyRepository _repo;

    public CustomerLoyaltyService(CustomerLoyaltyRepository repo) => _repo = repo;

    public async Task<CustomerLoyaltySummaryDto?> GetSummaryAsync(
        Guid tenantId,
        Guid customerId,
        CancellationToken cancellationToken = default)
    {
        var enrollments = await _repo.GetEnrollmentsAsync(tenantId, customerId, cancellationToken);
        if (enrollments.Count == 0)
            return null;

        var programs = new List<LoyaltyProgramSummaryDto>(enrollments.Count);
        foreach (var row in enrollments)
        {
            LoyaltyTierDto? currentTier = row.TierCode is null
                ? null
                : new LoyaltyTierDto(
                    row.TierCode,
                    row.TierName ?? row.TierCode,
                    row.TierMinPoints ?? 0,
                    row.TierDiscountPercent ?? 0);

            LoyaltyTierDto? nextTier = null;
            if (currentTier is not null)
            {
                var next = await _repo.GetNextTierAsync(row.ProgramId, currentTier.MinPoints, cancellationToken);
                if (next is not null)
                {
                    nextTier = new LoyaltyTierDto(
                        next.TierCode,
                        next.TierName,
                        next.MinPoints,
                        next.DiscountPercent);
                }
            }

            programs.Add(new LoyaltyProgramSummaryDto(
                row.ProgramId,
                row.ProgramCode,
                row.ProgramName,
                row.PointsBalance,
                row.LifetimePoints,
                currentTier,
                nextTier));
        }

        return new CustomerLoyaltySummaryDto(programs);
    }

    public async Task<PagedLoyaltyTransactionsResult> GetTransactionsAsync(
        Guid tenantId,
        Guid customerId,
        Guid? programId,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var (items, total) = await _repo.GetTransactionsAsync(
            tenantId,
            customerId,
            programId,
            page,
            pageSize,
            cancellationToken);

        var dtos = items.Select(row => new LoyaltyTransactionDto(
            row.Id,
            row.ProgramId,
            row.ProgramCode,
            (LoyaltyTransactionType)row.TransactionType,
            row.Points,
            row.SalesOrderId,
            row.Notes,
            new DateTimeOffset(DateTime.SpecifyKind(row.CreatedAt, DateTimeKind.Utc)))).ToList();

        return new PagedLoyaltyTransactionsResult(dtos, total, page, pageSize);
    }

    public async Task<LoyaltyProgramCatalogResult> GetProgramsAsync(
        Guid tenantId,
        Guid customerId,
        CancellationToken cancellationToken = default)
    {
        var programs = await _repo.GetProgramCatalogAsync(tenantId, customerId, cancellationToken);
        var result = new List<LoyaltyProgramCatalogDto>(programs.Count);

        foreach (var program in programs)
        {
            var tiers = await _repo.GetTiersForProgramAsync(program.ProgramId, cancellationToken);
            var tierDtos = tiers
                .Select(t => new LoyaltyTierDto(t.TierCode, t.TierName, t.MinPoints, t.DiscountPercent))
                .ToList();

            var isEnrolled = program.PointsBalance.HasValue;
            result.Add(new LoyaltyProgramCatalogDto(
                program.ProgramId,
                program.ProgramCode,
                program.ProgramName,
                program.PointsPerAmount,
                program.AmountPerPoint,
                tierDtos,
                isEnrolled,
                program.PointsBalance,
                program.LifetimePoints));
        }

        return new LoyaltyProgramCatalogResult(result);
    }

    public async Task<CustomerVoucherListResult> GetVouchersAsync(
        Guid tenantId,
        Guid customerId,
        bool includeUsed,
        CancellationToken cancellationToken = default)
    {
        var rows = await _repo.GetCustomerVouchersAsync(tenantId, customerId, includeUsed, cancellationToken);
        var now = DateTimeOffset.UtcNow;

        var items = rows.Select(row =>
        {
            var validFrom = new DateTimeOffset(DateTime.SpecifyKind(row.ValidFrom, DateTimeKind.Utc));
            var validTo = new DateTimeOffset(DateTime.SpecifyKind(row.ValidTo, DateTimeKind.Utc));
            var isUsed = row.UsedAt.HasValue;

            return new CustomerVoucherDto(
                row.CustomerVoucherId,
                row.VoucherId,
                row.VoucherCode,
                row.VoucherName,
                (VoucherDiscountType)row.DiscountType,
                row.DiscountValue,
                row.MinOrderAmount,
                validFrom,
                validTo,
                new DateTimeOffset(DateTime.SpecifyKind(row.IssuedAt, DateTimeKind.Utc)),
                row.UsedAt.HasValue
                    ? new DateTimeOffset(DateTime.SpecifyKind(row.UsedAt.Value, DateTimeKind.Utc))
                    : null,
                isUsed,
                !isUsed && now > validTo);
        }).ToList();

        return new CustomerVoucherListResult(items);
    }
}
