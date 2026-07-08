import type { SalesOrderDetailFull } from '@/shared/api/sales.types';

function computeLineRefundAmount(
  lineTotal: number,
  soldQuantity: number,
  returnQuantity: number,
  merchandiseNet: number,
  orderDiscountAmount: number,
): number {
  if (soldQuantity <= 0 || returnQuantity <= 0) return 0;
  const lineOrderDiscountShare =
    merchandiseNet > 0 ? (lineTotal / merchandiseNet) * orderDiscountAmount : 0;
  const refundableLineNet = lineTotal - lineOrderDiscountShare;
  return Math.round((refundableLineNet * returnQuantity) / soldQuantity);
}

export function previewReturnRefund(
  order: SalesOrderDetailFull,
  quantities: Record<string, number>,
): { totalRefund: number; lines: { itemId: string; quantity: number; refundAmount: number }[] } {
  const merchandiseNet = order.items.reduce((sum, line) => sum + line.lineTotal, 0);

  const lines = order.items
    .map((line) => {
      const quantity = Number(quantities[line.id ?? ''] ?? 0);
      if (quantity <= 0 || !line.id) return null;
      const refundAmount = computeLineRefundAmount(
        line.lineTotal,
        line.quantity,
        quantity,
        merchandiseNet,
        order.discountAmount,
      );
      return { itemId: line.id, quantity, refundAmount };
    })
    .filter((row): row is { itemId: string; quantity: number; refundAmount: number } => row !== null);

  return { totalRefund: lines.reduce((sum, row) => sum + row.refundAmount, 0), lines };
}

export function returnableQuantity(line: SalesOrderDetailFull['items'][number]): number {
  if (!line.batchId) return 0;
  return Math.max(0, line.quantity - (line.returnedQuantity ?? 0));
}
