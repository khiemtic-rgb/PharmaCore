using System.Data;
using KitPlatform.Packs.Pharmacy.Sales;
using KitPlatform.Infrastructure.Data;

namespace KitPlatform.Infrastructure.Loyalty;

internal sealed record VoucherRedeemResolution(
    Guid? VoucherId,
    Guid? CustomerVoucherId,
    decimal DiscountAmount,
    decimal OrderTotalAfterVoucher);

internal sealed class VoucherPosService
{
    private readonly VoucherRepository _repo;
    private readonly IDbConnectionFactory _db;

    public VoucherPosService(VoucherRepository repo, IDbConnectionFactory db)
    {
        _repo = repo;
        _db = db;
    }

    public async Task<PosCustomerVoucherListResult> GetPosCustomerVouchersAsync(
        Guid tenantId,
        Guid customerId,
        decimal orderTotalBeforeVoucher,
        CancellationToken cancellationToken)
    {
        var rows = await _repo.ListCustomerWalletAsync(tenantId, customerId, null, null, cancellationToken);
        var items = rows
            .Select(row => TryMapEligible(row, orderTotalBeforeVoucher))
            .Where(item => item is not null)
            .Cast<PosCustomerVoucherDto>()
            .ToList();
        return new PosCustomerVoucherListResult(items);
    }

    public async Task<VoucherRedeemResolution> ResolveVoucherAsync(
        Guid tenantId,
        Guid? customerId,
        Guid? customerVoucherId,
        decimal orderTotalBeforeVoucher,
        IDbConnection conn,
        IDbTransaction tx,
        CancellationToken cancellationToken)
    {
        if (customerId is not Guid customer || customerVoucherId is not Guid walletId)
            return new VoucherRedeemResolution(null, null, 0, orderTotalBeforeVoucher);

        if (orderTotalBeforeVoucher <= 0)
            throw new InvalidOperationException("Đơn hàng không còn số tiền để áp voucher.");

        var row = await _repo.GetCustomerVoucherAsync(tenantId, walletId, customer, conn, tx, cancellationToken)
            ?? throw new InvalidOperationException("Voucher không tồn tại trong ví khách.");

        var discount = ComputeDiscount(row, orderTotalBeforeVoucher);
        if (discount <= 0)
            throw new InvalidOperationException("Voucher không áp dụng được cho đơn này.");

        return new VoucherRedeemResolution(
            row.VoucherId,
            row.CustomerVoucherId,
            discount,
            orderTotalBeforeVoucher - discount);
    }

    public async Task TryMarkUsedAsync(
        Guid customerVoucherId,
        Guid voucherId,
        Guid salesOrderId,
        IDbConnection conn,
        IDbTransaction tx)
    {
        if (!await _repo.MarkUsedAsync(customerVoucherId, voucherId, salesOrderId, conn, tx))
            throw new InvalidOperationException("Không ghi nhận được voucher đã dùng.");
    }

    private static PosCustomerVoucherDto? TryMapEligible(CustomerVoucherDetailRow row, decimal orderTotal)
    {
        if (row.UsedAt is not null || row.Status != 1)
            return null;

        var now = DateTime.UtcNow;
        if (row.ValidFrom.ToUniversalTime() > now || row.ValidTo.ToUniversalTime() < now)
            return null;

        if (row.MaxUses is int max && row.UsedCount >= max)
            return null;

        if (orderTotal < row.MinOrderAmount)
            return null;

        var discount = ComputeDiscount(row, orderTotal);
        if (discount <= 0)
            return null;

        return new PosCustomerVoucherDto(
            row.CustomerVoucherId,
            row.VoucherId,
            row.VoucherCode,
            row.VoucherName,
            row.DiscountType,
            row.DiscountValue,
            row.MinOrderAmount,
            discount);
    }

    private static decimal ComputeDiscount(CustomerVoucherDetailRow row, decimal orderTotal)
    {
        if (orderTotal <= 0)
            return 0;

        if (row.MinOrderAmount > 0 && orderTotal < row.MinOrderAmount)
            return 0;

        var now = DateTime.UtcNow;
        if (row.Status != 1 || row.ValidFrom.ToUniversalTime() > now || row.ValidTo.ToUniversalTime() < now)
            return 0;

        if (row.MaxUses is int max && row.UsedCount >= max)
            return 0;

        if (row.UsedAt is not null)
            return 0;

        decimal discount = row.DiscountType == 1
            ? Math.Round(orderTotal * row.DiscountValue / 100m, 0, MidpointRounding.AwayFromZero)
            : Math.Round(row.DiscountValue, 0, MidpointRounding.AwayFromZero);

        return Math.Min(Math.Max(0, discount), orderTotal);
    }
}
