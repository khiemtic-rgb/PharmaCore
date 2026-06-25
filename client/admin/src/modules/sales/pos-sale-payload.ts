import type { CartLine, PosCheckoutPaymentLine } from '@/shared/api/sales.types';
import type { OrderDiscountState } from '@/modules/sales/pos-pricing';
import { defaultBatchLabel } from '@/modules/sales/pos-batch-mode-ui';

function resolveLineBatchNumber(line: CartLine): string | undefined {
  const manual = line.batchLabel?.trim();
  if (manual) return manual;
  return defaultBatchLabel(line.batchHints);
}

export function buildSaleLineItems(cart: CartLine[]) {
  return cart.map((line) => {
    const batchNumber = resolveLineBatchNumber(line);
    return {
      productId: line.productId,
      productUnitId: line.productUnitId,
      quantity: line.quantity,
      ...(batchNumber ? { batchNumber } : {}),
      ...(line.discountType
        ? { discountType: line.discountType, discountValue: line.discountValue ?? 0 }
        : {}),
    };
  });
}
export function buildCreateSalePayload(
  warehouseId: string,
  customerId: string | undefined,
  cart: CartLine[],
  orderDiscount: OrderDiscountState,
  saveAsDraft: boolean,
  payments?: PosCheckoutPaymentLine[],
  loyaltyDiscountAmount?: number,
) {
  return {
    warehouseId,
    customerId,
    saveAsDraft,
    orderDiscountType: orderDiscount.discountType,
    orderDiscountValue: orderDiscount.discountValue,
    payments: payments?.map((p) => ({ paymentMethod: p.paymentMethod, amount: p.amount })),
    ...(loyaltyDiscountAmount != null && loyaltyDiscountAmount > 0 ? { loyaltyDiscountAmount } : {}),
    items: buildSaleLineItems(cart),
  };
}

export function buildDraftCompletePayload(
  customerId: string | undefined,
  cart: CartLine[],
  orderDiscount: OrderDiscountState,
  notes?: string,
  loyaltyDiscountAmount?: number,
) {
  return {
    customerId: customerId ?? null,
    orderDiscountType: orderDiscount.discountType ?? null,
    orderDiscountValue: orderDiscount.discountType ? (orderDiscount.discountValue ?? 0) : null,
    notes: notes ?? null,
    ...(loyaltyDiscountAmount != null && loyaltyDiscountAmount > 0 ? { loyaltyDiscountAmount } : {}),
    items: buildSaleLineItems(cart),
  };
}

export function buildDraftUpdatePayload(
  customerId: string | undefined,
  cart: CartLine[],
  orderDiscount: OrderDiscountState,
  notes?: string,
) {
  return {
    customerId: customerId ?? null,
    priceType: 1,
    orderDiscountType: orderDiscount.discountType ?? null,
    orderDiscountValue: orderDiscount.discountType ? (orderDiscount.discountValue ?? 0) : null,
    notes: notes ?? null,
    items: buildSaleLineItems(cart),
  };
}
