import type { PosCustomerLoyalty } from '@/shared/api/sales.types';
import { roundMoney } from '@/modules/sales/pos-pricing';

export function computeMaxLoyaltyRedeem(orderAfterVoucher: number, loyalty: PosCustomerLoyalty): number {
  if (orderAfterVoucher <= 0) return 0;
  const capByPercent = roundMoney((orderAfterVoucher * loyalty.maxRedeemPercent) / 100);
  return Math.min(loyalty.maxRedeemDiscountAmount, capByPercent, orderAfterVoucher);
}

export function canOfferLoyaltyRedeem(loyalty: PosCustomerLoyalty | null, maxRedeemMoney: number): boolean {
  return Boolean(loyalty?.loyaltyEnabled && (loyalty.pointsBalance ?? 0) > 0 && maxRedeemMoney > 0);
}

export function loyaltyPointsValue(loyalty: PosCustomerLoyalty): number {
  if (loyalty.pointsBalance <= 0 || loyalty.amountPerPoint <= 0) return 0;
  return loyalty.pointsBalance * loyalty.amountPerPoint;
}

export function loyaltyPointsForDiscount(
  discountAmount: number,
  loyalty: PosCustomerLoyalty,
): number {
  if (discountAmount <= 0 || loyalty.amountPerPoint <= 0) return 0;
  return discountAmount / loyalty.amountPerPoint;
}
