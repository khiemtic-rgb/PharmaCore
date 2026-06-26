import type { CartLine } from '@/shared/api/sales.types';
import type { CustomerDraftOrderLineInput } from '@/shared/api/customer-draft-orders.api';
import type { OrderDiscountState } from '@/modules/sales/pos-pricing';

export function buildCustomerDraftOrderPayload(
  customerId: string,
  warehouseId: string | undefined,
  cart: CartLine[],
  orderDiscount: OrderDiscountState,
) {
  const items: CustomerDraftOrderLineInput[] = cart.map((line) => ({
    productId: line.productId,
    productUnitId: line.productUnitId,
    quantity: line.quantity,
    ...(line.discountType
      ? { discountType: line.discountType, discountValue: line.discountValue ?? 0 }
      : {}),
  }));

  return {
    customerId,
    warehouseId,
    priceType: 1,
    orderDiscountType: orderDiscount.discountType,
    orderDiscountValue: orderDiscount.discountValue,
    items,
  };
}
