using PharmaCore.Application.Abstractions;
using PharmaCore.Application.Loyalty;

namespace PharmaCore.Infrastructure.Loyalty;

internal sealed class VoucherAdminService : IVoucherAdminService
{
    private readonly VoucherRepository _repo;
    private readonly ITenantContext _tenant;

    public VoucherAdminService(VoucherRepository repo, ITenantContext tenant)
    {
        _repo = repo;
        _tenant = tenant;
    }

    public async Task<VoucherListResult> ListAsync(CancellationToken cancellationToken = default)
    {
        var rows = await _repo.ListAsync(_tenant.TenantId, cancellationToken);
        return new VoucherListResult(rows.Select(Map).ToList());
    }

    public async Task<VoucherAdminDto?> GetAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var row = await _repo.GetAsync(_tenant.TenantId, id, cancellationToken);
        return row is null ? null : Map(row);
    }

    public async Task<VoucherAdminDto> CreateAsync(
        UpsertVoucherRequest request,
        CancellationToken cancellationToken = default)
    {
        ValidateRequest(request);
        var tenantId = _tenant.TenantId;
        var code = request.VoucherCode.Trim().ToUpperInvariant();
        if (await _repo.CodeExistsAsync(tenantId, code, null, cancellationToken))
            throw new InvalidOperationException($"Mã voucher '{code}' đã tồn tại.");

        var id = await _repo.CreateAsync(
            tenantId,
            code,
            request.VoucherName.Trim(),
            request.DiscountType,
            request.DiscountValue,
            request.MinOrderAmount,
            request.MaxUses,
            request.ValidFrom.UtcDateTime,
            request.ValidTo.UtcDateTime,
            request.Status,
            cancellationToken);

        return (await GetAsync(id, cancellationToken))!;
    }

    public async Task<VoucherAdminDto> UpdateAsync(
        Guid id,
        UpsertVoucherRequest request,
        CancellationToken cancellationToken = default)
    {
        ValidateRequest(request);
        var tenantId = _tenant.TenantId;
        var code = request.VoucherCode.Trim().ToUpperInvariant();
        if (await _repo.CodeExistsAsync(tenantId, code, id, cancellationToken))
            throw new InvalidOperationException($"Mã voucher '{code}' đã tồn tại.");

        await _repo.UpdateAsync(
            tenantId,
            id,
            code,
            request.VoucherName.Trim(),
            request.DiscountType,
            request.DiscountValue,
            request.MinOrderAmount,
            request.MaxUses,
            request.ValidFrom.UtcDateTime,
            request.ValidTo.UtcDateTime,
            request.Status,
            cancellationToken);

        return (await GetAsync(id, cancellationToken))!;
    }

    public async Task IssueAsync(
        Guid voucherId,
        IssueVoucherRequest request,
        CancellationToken cancellationToken = default)
    {
        var voucher = await _repo.GetAsync(_tenant.TenantId, voucherId, cancellationToken)
            ?? throw new InvalidOperationException("Voucher không tồn tại.");
        if (voucher.Status != VoucherStatuses.Active)
            throw new InvalidOperationException("Voucher không còn hiệu lực.");

        if (!await _repo.IssueAsync(_tenant.TenantId, voucherId, request.CustomerId, cancellationToken))
            throw new InvalidOperationException("Không phát được voucher (khách không tồn tại hoặc đã có voucher này).");
    }

    public async Task<VoucherIssueCandidateListResult> SearchIssueCandidatesAsync(
        Guid voucherId,
        VoucherIssueCandidateSearchRequest request,
        CancellationToken cancellationToken = default)
    {
        _ = await _repo.GetAsync(_tenant.TenantId, voucherId, cancellationToken)
            ?? throw new InvalidOperationException("Voucher không tồn tại.");

        var query = BuildSearchParams(request);
        var (rows, total) = await _repo.SearchIssueCandidatesAsync(
            _tenant.TenantId,
            voucherId,
            query,
            cancellationToken);

        var items = rows.Select(row => new VoucherIssueCandidateDto(
            row.Id,
            row.CustomerCode,
            row.FullName,
            row.Phone,
            row.TierName,
            row.PeriodRevenue,
            row.DateOfBirth,
            row.AlreadyIssued)).ToList();

        return new VoucherIssueCandidateListResult(items, total, query.Page, query.PageSize);
    }

    public async Task<IssueVoucherBulkResult> IssueBulkAsync(
        Guid voucherId,
        IssueVoucherBulkRequest request,
        CancellationToken cancellationToken = default)
    {
        var voucher = await _repo.GetAsync(_tenant.TenantId, voucherId, cancellationToken)
            ?? throw new InvalidOperationException("Voucher không tồn tại.");
        if (voucher.Status != VoucherStatuses.Active)
            throw new InvalidOperationException("Voucher không còn hiệu lực.");

        var ids = request.CustomerIds?.Where(id => id != Guid.Empty).Distinct().ToList() ?? [];
        if (ids.Count == 0)
            throw new InvalidOperationException("Chọn ít nhất một khách hàng.");
        if (ids.Count > 500)
            throw new InvalidOperationException("Tối đa 500 khách mỗi lần phát.");

        var issued = await _repo.IssueBulkAsync(_tenant.TenantId, voucherId, ids, cancellationToken);
        return new IssueVoucherBulkResult(
            issued,
            ids.Count - issued,
            0);
    }

    public async Task<IssuedCustomerVoucherListResult> ListIssuedAsync(
        Guid voucherId,
        CancellationToken cancellationToken = default)
    {
        var rows = await _repo.ListIssuedAsync(_tenant.TenantId, voucherId, cancellationToken);
        var items = rows.Select(row => new IssuedCustomerVoucherDto(
            row.CustomerVoucherId,
            row.CustomerId,
            row.CustomerName,
            row.CustomerPhone,
            ToOffset(row.IssuedAt),
            ToOffset(row.UsedAt))).ToList();
        return new IssuedCustomerVoucherListResult(items);
    }

    public Task<(bool Ok, string? Error)> DeleteAsync(Guid id, CancellationToken cancellationToken = default) =>
        _repo.TryDeleteAsync(_tenant.TenantId, id, cancellationToken);

    private static void ValidateRequest(UpsertVoucherRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.VoucherCode))
            throw new InvalidOperationException("Nhập mã voucher.");
        if (string.IsNullOrWhiteSpace(request.VoucherName))
            throw new InvalidOperationException("Nhập tên voucher.");
        if (request.DiscountValue <= 0)
            throw new InvalidOperationException("Giá trị giảm phải lớn hơn 0.");
        if (request.MinOrderAmount < 0)
            throw new InvalidOperationException("Giá trị đơn tối thiểu không hợp lệ.");
        if (request.ValidTo <= request.ValidFrom)
            throw new InvalidOperationException("Ngày hết hạn phải sau ngày bắt đầu.");
        if (request.MaxUses is int max && max <= 0)
            throw new InvalidOperationException("Số lần dùng tối đa phải lớn hơn 0.");
    }

    private static VoucherIssueCandidateSearchParams BuildSearchParams(VoucherIssueCandidateSearchRequest request)
    {
        var page = request.Page < 1 ? 1 : request.Page;
        var pageSize = request.PageSize switch
        {
            < 1 => 50,
            > 200 => 200,
            _ => request.PageSize,
        };

        var revenueEnabled = false;
        DateTime? revenueFrom = null;
        DateTime? revenueToExclusive = null;
        decimal minRevenue = 0;

        if (request.RevenueEnabled)
        {
            if (request.RevenueFrom is null || request.RevenueTo is null)
                throw new InvalidOperationException("Chọn khoảng ngày doanh thu.");
            if (request.MinRevenue is not decimal minRev || minRev < 0)
                throw new InvalidOperationException("Nhập ngưỡng doanh thu hợp lệ.");

            var from = request.RevenueFrom.Value.UtcDateTime.Date;
            var toExclusive = request.RevenueTo.Value.UtcDateTime.Date.AddDays(1);
            if (toExclusive <= from)
                throw new InvalidOperationException("Ngày kết thúc doanh thu phải sau ngày bắt đầu.");
            if ((toExclusive - from).TotalDays > 366)
                throw new InvalidOperationException("Khoảng doanh thu tối đa 366 ngày.");

            revenueEnabled = true;
            revenueFrom = from;
            revenueToExclusive = toExclusive;
            minRevenue = minRev;
        }

        var birthdayEnabled = false;
        var birthdayFromMmDd = 0;
        var birthdayToMmDd = 0;
        var birthdayWrapsYear = false;

        if (request.BirthdayEnabled)
        {
            if (request.BirthdayFromMonth is not int fromMonth
                || request.BirthdayFromDay is not int fromDay
                || request.BirthdayToMonth is not int toMonth
                || request.BirthdayToDay is not int toDay)
                throw new InvalidOperationException("Chọn khoảng sinh nhật (ngày/tháng).");

            ValidateBirthdayPart(fromMonth, fromDay);
            ValidateBirthdayPart(toMonth, toDay);

            birthdayEnabled = true;
            birthdayFromMmDd = fromMonth * 100 + fromDay;
            birthdayToMmDd = toMonth * 100 + toDay;
            birthdayWrapsYear = birthdayFromMmDd > birthdayToMmDd;
        }

        var tierEnabled = false;
        IReadOnlyList<Guid>? tierIds = null;

        if (request.TierEnabled)
        {
            var ids = request.TierIds?.Where(id => id != Guid.Empty).Distinct().ToList() ?? [];
            if (ids.Count == 0)
                throw new InvalidOperationException("Chọn ít nhất một hạng tích điểm.");

            tierEnabled = true;
            tierIds = ids;
        }

        return new VoucherIssueCandidateSearchParams
        {
            Search = string.IsNullOrWhiteSpace(request.Search) ? null : request.Search.Trim(),
            ExcludeAlreadyIssued = request.ExcludeAlreadyIssued,
            Page = page,
            PageSize = pageSize,
            RevenueEnabled = revenueEnabled,
            RevenueFrom = revenueFrom,
            RevenueToExclusive = revenueToExclusive,
            MinRevenue = minRevenue,
            BirthdayEnabled = birthdayEnabled,
            BirthdayFromMmDd = birthdayFromMmDd,
            BirthdayToMmDd = birthdayToMmDd,
            BirthdayWrapsYear = birthdayWrapsYear,
            TierEnabled = tierEnabled,
            TierIds = tierIds,
        };
    }

    private static void ValidateBirthdayPart(int month, int day)
    {
        if (month is < 1 or > 12)
            throw new InvalidOperationException("Tháng sinh nhật phải từ 1 đến 12.");
        if (day is < 1 or > 31)
            throw new InvalidOperationException("Ngày sinh nhật phải từ 1 đến 31.");
    }

    private static VoucherAdminDto Map(VoucherRow row) =>
        new(
            row.Id,
            row.VoucherCode,
            row.VoucherName,
            row.DiscountType,
            row.DiscountValue,
            row.MinOrderAmount,
            row.MaxUses,
            row.UsedCount,
            ToOffset(row.ValidFrom),
            ToOffset(row.ValidTo),
            row.Status,
            row.IssuedCount);

    private static DateTimeOffset ToOffset(DateTime value) =>
        new(DateTime.SpecifyKind(value, DateTimeKind.Utc));

    private static DateTimeOffset? ToOffset(DateTime? value) =>
        value is null ? null : ToOffset(value.Value);
}
