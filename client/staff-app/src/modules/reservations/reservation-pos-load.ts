import { lookupPosProduct } from '@/shared/api/sales.api';
import type { ReservationPosLoad } from '@/shared/api/reservations.api';
import type { CartLine } from '@/shared/api/sales.types';

export async function buildReservationCartLines(payload: ReservationPosLoad): Promise<CartLine[]> {
  const lines: CartLine[] = [];
  for (const item of payload.lines) {
    let stockAvailable = 0;
    let unitPrice = 0;
    let batchHints: CartLine['batchHints'];
    try {
      const lookup = await lookupPosProduct(item.productCode, payload.warehouseId);
      stockAvailable = lookup.stockAvailable;
      unitPrice = lookup.unitPrice;
      batchHints = lookup.batchHints;
    } catch {
      /* keep zeros */
    }
    lines.push({
      key: item.productUnitId,
      productId: item.productId,
      productCode: item.productCode,
      productName: item.productName,
      productUnitId: item.productUnitId,
      unitName: item.unitName,
      quantity: item.quantity,
      unitPrice,
      stockAvailable,
      batchHints,
    });
  }
  return lines;
}
