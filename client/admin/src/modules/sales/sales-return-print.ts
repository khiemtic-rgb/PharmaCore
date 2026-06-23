import type { SalesReturnDetail } from '@/shared/api/sales.types';
import { SALES_PAYMENT_METHOD_LABELS } from '@/shared/api/sales.types';
import { loadReceiptStoreSettings } from '@/modules/sales/receipt-settings';
import {
  buildThermalReceiptDocument,
  dashedLine,
  formatReceiptDateTime,
  formatThermalMoney,
  openThermalPrintWindow,
  rowBetween,
} from '@/modules/sales/thermal-receipt-print';
import { escapeHtml } from '@/shared/utils/escape-html';

function buildReturnItemHtml(line: SalesReturnDetail['items'][number]): string {
  const name = escapeHtml(line.productName);
  const batch = escapeHtml(line.batchNumber || '—');
  const qtyLabel = `${line.quantity.toLocaleString('vi-VN')}`;

  return `
    <div class="item">
      <div class="item-name">${name}</div>
      <div class="item-sub">Lô: ${batch}</div>
      <div class="row">
        <span class="row-left">SL trả: ${qtyLabel}</span>
        <span class="row-right">${formatThermalMoney(line.refundAmount)}</span>
      </div>
    </div>`;
}

function buildRefundPaymentSection(ret: SalesReturnDetail): string {
  const payments = ret.payments ?? [];
  if (payments.length === 0) {
    return rowBetween('Hoàn tiền', formatThermalMoney(ret.totalRefund), 'sub');
  }

  return payments
    .map((p) => {
      const label = SALES_PAYMENT_METHOD_LABELS[p.paymentMethod] ?? String(p.paymentMethod);
      return rowBetween(label, formatThermalMoney(p.amount), 'sub');
    })
    .join('');
}

export async function buildSalesReturnHtml(ret: SalesReturnDetail): Promise<string> {
  const store = await loadReceiptStoreSettings();
  const storeName = escapeHtml(store.name);
  const storeTagline = store.tagline ? escapeHtml(store.tagline) : '';
  const storePhone = store.phone ? escapeHtml(store.phone) : '';
  const storeAddress = store.address ? escapeHtml(store.address) : '';
  const headerContact = [storePhone ? `ĐT: ${storePhone}` : '', storeAddress]
    .filter(Boolean)
    .join(' · ');

  const itemBlocks = ret.items.map((line) => buildReturnItemHtml(line)).join('');
  const paymentBlock = buildRefundPaymentSection(ret);

  const bodyHtml = `
    <div class="center store-name">${storeName}</div>
    ${storeTagline ? `<div class="center store-sub">${storeTagline}</div>` : ''}
    ${headerContact ? `<div class="center store-contact">${headerContact}</div>` : ''}

    ${dashedLine()}
    <div class="center title">PHIẾU TRẢ HÀNG</div>

    <div class="meta">Số phiếu: <strong>${escapeHtml(ret.returnNumber)}</strong></div>
    <div class="meta">Đơn bán: ${escapeHtml(ret.orderNumber)}</div>
    <div class="meta">Ngày trả: ${formatReceiptDateTime(ret.returnDate)}</div>
    ${ret.reason ? `<div class="meta">Lý do: ${escapeHtml(ret.reason)}</div>` : ''}

    ${dashedLine()}
    <div class="items">${itemBlocks}</div>
    ${dashedLine()}

    ${rowBetween('TỔNG HOÀN', formatThermalMoney(ret.totalRefund), 'total')}
    ${paymentBlock ? `${dashedLine()}${paymentBlock}` : ''}

    ${dashedLine()}
    <div class="footer">
      <div>Đã hoàn trả hàng</div>
      <div class="note" style="margin-top:6px">Phiếu trả hàng — lưu nội bộ</div>
    </div>`;

  return buildThermalReceiptDocument(escapeHtml(ret.returnNumber), bodyHtml);
}

export async function printSalesReturn(ret: SalesReturnDetail): Promise<boolean> {
  const html = await buildSalesReturnHtml(ret);
  return openThermalPrintWindow(html);
}
