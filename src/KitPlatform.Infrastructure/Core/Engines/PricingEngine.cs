using KitPlatform.Application.Core.Engines;
using KitPlatform.Packs.Pharmacy.Procurement;
using KitPlatform.Packs.Pharmacy.Sales;

namespace KitPlatform.Infrastructure.Core.Engines;

/// <summary>Wraps existing static pricing — zero behavior change for pilot.</summary>
internal sealed class PricingEngine : IPricingEngine
{
    public SaleOrderPricingResult PriceSaleOrder(
        IReadOnlyList<(CreateSaleLineRequest Request, decimal UnitPrice, decimal ConversionFactor)> lines,
        SaleDiscountInput? orderDiscount)
        => SalesPricing.PriceOrder(lines, orderDiscount);

    public void ValidateSaleDiscounts(SaleOrderPricingResult pricing, SalesDiscountPolicy policy)
        => SalesPricing.ValidateDiscounts(pricing, policy);

    public decimal ComputeSaleLineRefundAmount(
        decimal lineTotal,
        decimal soldQuantity,
        decimal returnQuantity,
        decimal merchandiseNet,
        decimal orderDiscountAmount)
        => SalesPricing.ComputeLineRefundAmount(
            lineTotal,
            soldQuantity,
            returnQuantity,
            merchandiseNet,
            orderDiscountAmount);

    public GrnPricingResult PriceGoodsReceipt(
        IReadOnlyList<(decimal Quantity, decimal UnitCost, ProcurementDiscountInput LineDiscount)> lines,
        ProcurementDiscountInput? orderDiscount,
        decimal taxRatePercent,
        bool vatIsNotSubject)
        => ProcurementPricing.PriceReceipt(lines, orderDiscount, taxRatePercent, vatIsNotSubject);
}
