namespace PharmaCore.Application.Procurement;

public static class SupplierPlaceholderCodes
{
    public const string Code = "NCC-TBD";
}

public static class ProcurementDiscountTypes
{
    public const short Percent = 1;
    public const short Fixed = 2;
}

public sealed record ProcurementDiscountInput(short? DiscountType, decimal? DiscountValue);

public sealed record PricedGrnLineResult(
    decimal Quantity,
    decimal UnitCost,
    decimal GrossTotal,
    decimal DiscountAmount,
    short? DiscountType,
    decimal DiscountValue,
    decimal LineNetTotal,
    decimal InventoryUnitCost);

public sealed record GrnPricingResult(
    decimal SubtotalGross,
    decimal LineDiscountTotal,
    decimal MerchandiseNet,
    decimal OrderDiscountAmount,
    decimal TaxableAmount,
    decimal TaxAmount,
    decimal TotalAmount,
    IReadOnlyList<PricedGrnLineResult> Lines);

public static class ProcurementPricing
{
    public static decimal ComputeDiscountAmount(decimal basis, short? discountType, decimal? discountValue)
    {
        if (basis <= 0 || discountType is null || discountValue is null || discountValue <= 0)
            return 0;

        return discountType switch
        {
            ProcurementDiscountTypes.Percent => Math.Round(
                basis * Math.Min(discountValue.Value, 100m) / 100m,
                2,
                MidpointRounding.AwayFromZero),
            ProcurementDiscountTypes.Fixed => Math.Min(discountValue.Value, basis),
            _ => 0,
        };
    }

    public static GrnPricingResult PriceReceipt(
        IReadOnlyList<(decimal Quantity, decimal UnitCost, ProcurementDiscountInput LineDiscount)> lines,
        ProcurementDiscountInput? orderDiscount,
        decimal taxRatePercent,
        bool vatIsNotSubject)
    {
        var pricedLines = new List<PricedGrnLineResult>();
        decimal subtotalGross = 0;
        decimal lineDiscountTotal = 0;

        foreach (var (quantity, unitCost, lineDiscount) in lines)
        {
            var gross = Math.Round(quantity * unitCost, 2, MidpointRounding.AwayFromZero);
            var discountAmount = ComputeDiscountAmount(gross, lineDiscount.DiscountType, lineDiscount.DiscountValue);
            subtotalGross += gross;
            lineDiscountTotal += discountAmount;
            pricedLines.Add(new PricedGrnLineResult(
                quantity,
                unitCost,
                gross,
                discountAmount,
                lineDiscount.DiscountType,
                lineDiscount.DiscountValue ?? 0,
                gross - discountAmount,
                0));
        }

        var merchandiseNet = subtotalGross - lineDiscountTotal;
        var orderDiscountAmount = ComputeDiscountAmount(
            merchandiseNet,
            orderDiscount?.DiscountType,
            orderDiscount?.DiscountValue);
        var taxableAmount = merchandiseNet - orderDiscountAmount;
        var taxAmount = vatIsNotSubject || taxRatePercent <= 0
            ? 0
            : ProcurementVatTax.ComputeTaxAmount(taxableAmount, taxRatePercent);
        var totalAmount = taxableAmount + taxAmount;

        var linesWithInventoryCost = new List<PricedGrnLineResult>();
        foreach (var line in pricedLines)
        {
            var orderShare = merchandiseNet > 0
                ? Math.Round(line.LineNetTotal / merchandiseNet * orderDiscountAmount, 2, MidpointRounding.AwayFromZero)
                : 0;
            var netExVat = line.LineNetTotal - orderShare;
            var inventoryUnitCost = line.Quantity > 0
                ? Math.Round(netExVat / line.Quantity, 2, MidpointRounding.AwayFromZero)
                : 0;
            linesWithInventoryCost.Add(line with { InventoryUnitCost = inventoryUnitCost });
        }

        return new GrnPricingResult(
            subtotalGross,
            lineDiscountTotal,
            merchandiseNet,
            orderDiscountAmount,
            taxableAmount,
            taxAmount,
            totalAmount,
            linesWithInventoryCost);
    }
}
