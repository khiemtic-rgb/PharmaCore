import type { SalesOrderDetail } from '@/shared/api/sales.types';
import { formatDisplayMoney } from '@/shared/utils/money';

export function formatPosCheckoutSuccessMessage(order: SalesOrderDetail): string {
  const base = `Đã bán ${order.orderNumber} — ${formatDisplayMoney(order.totalAmount)}`;
  const parts: string[] = [];
  const redeemed = order.loyaltyPointsRedeemed ?? 0;
  const earned = order.loyaltyPointsEarned ?? 0;
  if (redeemed > 0) {
    parts.push(`−${redeemed.toLocaleString('vi-VN')} điểm`);
  }
  if (earned > 0) {
    parts.push(`+${earned.toLocaleString('vi-VN')} điểm`);
  }
  if (parts.length === 0) return base;
  return `${base} · ${parts.join(' · ')}`;
}
