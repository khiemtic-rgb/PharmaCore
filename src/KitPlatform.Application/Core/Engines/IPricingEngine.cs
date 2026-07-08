using KitPlatform.Packs.Pharmacy.Procurement;
using KitPlatform.Packs.Pharmacy.Sales;

namespace KitPlatform.Application.Core.Engines;

/// <summary>
/// Core Pricing Engine — sales + procurement pricing (BR-PRC-*).
/// Pilot: delegates to existing <see cref="SalesPricing"/> / <see cref="ProcurementPricing"/>.
/// </summary>
public interface IPricingEngine
{
    SaleOrderPricingResult PriceSaleOrder(
        IReadOnlyList<(CreateSaleLineRequest Request, decimal UnitPrice, decimal ConversionFactor)> lines,
        SaleDiscountInput? orderDiscount);

    void ValidateSaleDiscounts(SaleOrderPricingResult pricing, SalesDiscountPolicy policy);

    decimal ComputeSaleLineRefundAmount(
        decimal lineTotal,
        decimal soldQuantity,
        decimal returnQuantity,
        decimal merchandiseNet,
        decimal orderDiscountAmount);

    GrnPricingResult PriceGoodsReceipt(
        IReadOnlyList<(decimal Quantity, decimal UnitCost, ProcurementDiscountInput LineDiscount)> lines,
        ProcurementDiscountInput? orderDiscount,
        decimal taxRatePercent,
        bool vatIsNotSubject);
}
