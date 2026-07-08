import dayjs from 'dayjs';
import type { ReceiptStoreSettings } from '@/shared/api/sales.types';
import type { CustomerPaymentReceipt } from '@/shared/api/receivables.api';
import { formatMoney } from '@/shared/utils/money';
import { printReceiptDocument } from '@/modules/sales/receipt-print';

const PAYMENT_LABEL: Record<number, string> = {
  1: 'Tiền mặt',
  2: 'Thẻ',
  3: 'Chuyển khoản',
  4: 'Ví điện tử',
  5: 'Ghi nợ',
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildPaymentReceiptHtml(
  payment: CustomerPaymentReceipt,
  store: ReceiptStoreSettings,
): string {
  return `<!DOCTYPE html>
<html lang="vi"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<style>
  @page { size: 80mm auto; margin: 2mm 3mm; }
  body { font-family: 'Courier New', monospace; font-size: 12px; width: 72mm; margin: 0 auto; color: #000; }
  .center { text-align: center; }
  .store { font-size: 15px; font-weight: 700; }
  .muted { font-size: 11px; color: #333; }
  .rule { text-align: center; margin: 6px 0; overflow: hidden; }
  .row { display: flex; justify-content: space-between; gap: 8px; margin: 4px 0; }
  .total { font-size: 14px; font-weight: 700; margin-top: 8px; }
</style></head><body>
  <div class="center store">${escapeHtml(store.name)}</div>
  ${store.address ? `<div class="center muted">${escapeHtml(store.address)}</div>` : ''}
  ${store.phone ? `<div class="center muted">ĐT: ${escapeHtml(store.phone)}</div>` : ''}
  <div class="rule">────────────────</div>
  <div class="center"><strong>PHIẾU THU</strong></div>
  <div>Số: ${escapeHtml(payment.paymentNumber)}</div>
  <div>Ngày: ${dayjs(payment.paymentDate).format('DD/MM/YYYY HH:mm')}</div>
  <div class="rule">────────────────</div>
  <div>KH: ${escapeHtml(payment.customerName)}</div>
  ${payment.customerCode ? `<div>Mã KH: ${escapeHtml(payment.customerCode)}</div>` : ''}
  ${payment.orderNumber ? `<div>Đơn: ${escapeHtml(payment.orderNumber)}</div>` : ''}
  <div class="rule">────────────────</div>
  <div class="row"><span>Hình thức</span><span>${PAYMENT_LABEL[payment.paymentMethod] ?? 'TT'}</span></div>
  <div class="row total"><span>SỐ TIỀN</span><span>${formatMoney(payment.amount)}</span></div>
  ${payment.notes ? `<div class="muted">Ghi chú: ${escapeHtml(payment.notes)}</div>` : ''}
  <div class="rule">────────────────</div>
  <div class="center muted">Đã ghi sổ · Cảm ơn quý khách!</div>
</body></html>`;
}

export function printPaymentReceipt(payment: CustomerPaymentReceipt, store: ReceiptStoreSettings): void {
  printReceiptDocument(buildPaymentReceiptHtml(payment, store));
}
