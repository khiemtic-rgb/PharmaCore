import type { SalesOrderDetail, SalesOrderItem } from '@/shared/api/sales.types';
import { SALES_PAYMENT_METHOD_LABELS } from '@/shared/api/sales.types';
import { buildOrderNetPaymentLines } from '@/modules/sales/sales-payment-summary';
import {
  computeOrderTotalRefunded,
  orderDisplayStatus,
  remainingLineNet,
} from '@/modules/sales/sales-return-pricing';
import { loadReceiptStoreSettings, type ReceiptStoreSettings } from '@/modules/sales/receipt-settings';
import {
  buildThermalReceiptDocument,
  dashedLine,
  formatReceiptDateTime,
  formatThermalMoney,
  openThermalPrintWindow,
  rowBetween,
} from '@/modules/sales/thermal-receipt-print';
import { escapeHtml } from '@/shared/utils/escape-html';

function returnedQty(line: SalesOrderItem): number {
  return line.returnedQuantity ?? 0;
}

function netQty(line: SalesOrderItem): number {
  return Math.max(0, line.quantity - returnedQty(line));
}

function buildLineItemHtml(
  line: SalesOrderItem,
  order: SalesOrderDetail,
  hasReturns: boolean,
): string {
  const qty = hasReturns ? netQty(line) : line.quantity;
  if (qty <= 0) return '';

  const lineTotal = hasReturns ? remainingLineNet(line, order) : line.lineTotal;
  const name = escapeHtml(line.productName);
  const unit = escapeHtml(line.unitName);
  const qtyLabel = `${qty.toLocaleString('vi-VN')} ${unit}`;

  const discount =
    (line.discountAmount ?? 0) > 0
      ? `<div class="row sub"><span class="row-left">  CK</span><span class="row-right">-${formatThermalMoney(line.discountAmount ?? 0)}</span></div>`
      : '';

  return `
    <div class="item">
      <div class="item-name">${name}</div>
      <div class="row">
        <span class="row-left">${qtyLabel} x ${formatThermalMoney(line.unitPrice)}</span>
        <span class="row-right">${formatThermalMoney(lineTotal)}</span>
      </div>
      ${discount}
    </div>`;
}

function buildPaymentSection(order: SalesOrderDetail, hasReturns: boolean): string {
  const { lines: netLines } = buildOrderNetPaymentLines(order);
  const payments = order.payments ?? [];

  if (hasReturns && netLines.length > 0) {
    return netLines
      .map((line) => {
        const label = SALES_PAYMENT_METHOD_LABELS[line.paymentMethod] ?? String(line.paymentMethod);
        return rowBetween(label, formatThermalMoney(line.net), 'sub');
      })
      .join('');
  }

  if (payments.length === 0) {
    return rowBetween('Thanh toán', formatThermalMoney(order.totalAmount));
  }

  return payments
    .map((p) => {
      const label = SALES_PAYMENT_METHOD_LABELS[p.paymentMethod] ?? String(p.paymentMethod);
      return rowBetween(label, formatThermalMoney(p.amount), 'sub');
    })
    .join('');
}

export function buildSalesInvoiceHtml(order: SalesOrderDetail, receiptStore: ReceiptStoreSettings): string {
  const hasReturns = order.items.some((line) => returnedQty(line) > 0);
  const totalRefunded =
    order.totalRefunded && order.totalRefunded > 0
      ? order.totalRefunded
      : computeOrderTotalRefunded(order);
  const netPayable = Math.max(0, order.totalAmount - totalRefunded);

  const lineDiscountTotal =
    order.lineDiscountTotal ??
    order.items.reduce((sum, line) => sum + (line.discountAmount ?? 0), 0);

  const itemBlocks = order.items
    .map((line) => buildLineItemHtml(line, order, hasReturns))
    .filter(Boolean)
    .join('');

  const statusLabel = orderDisplayStatus({
    status: order.status,
    totalRefunded: order.totalRefunded ?? totalRefunded,
    items: order.items,
  }).label;

  const storeName = escapeHtml(receiptStore.name);
  const storeTagline = receiptStore.tagline ? escapeHtml(receiptStore.tagline) : '';
  const storePhone = receiptStore.phone ? escapeHtml(receiptStore.phone) : '';
  const storeAddress = receiptStore.address ? escapeHtml(receiptStore.address) : '';

  const headerContact = [storePhone ? `ĐT: ${storePhone}` : '', storeAddress]
    .filter(Boolean)
    .join(' · ');

  const totalsBlock = hasReturns
    ? `
      ${rowBetween('Tổng tiền hàng', formatThermalMoney(order.subtotal), 'sub')}
      ${lineDiscountTotal > 0 ? rowBetween('Chiết khấu SP', `-${formatThermalMoney(lineDiscountTotal)}`, 'sub') : ''}
      ${order.discountAmount > 0 ? rowBetween('Chiết khấu đơn', `-${formatThermalMoney(order.discountAmount)}`, 'sub') : ''}
      ${rowBetween('Khách đã trả', formatThermalMoney(order.totalAmount), 'sub')}
      ${totalRefunded > 0 ? rowBetween('Đã hoàn trả', `-${formatThermalMoney(totalRefunded)}`, 'sub') : ''}
      ${rowBetween('Còn lại', formatThermalMoney(netPayable), 'total')}
    `
    : `
      ${rowBetween('Tạm tính', formatThermalMoney(order.subtotal), 'sub')}
      ${lineDiscountTotal > 0 ? rowBetween('Chiết khấu SP', `-${formatThermalMoney(lineDiscountTotal)}`, 'sub') : ''}
      ${order.discountAmount > 0 ? rowBetween('Chiết khấu đơn', `-${formatThermalMoney(order.discountAmount)}`, 'sub') : ''}
      ${rowBetween('TỔNG CỘNG', formatThermalMoney(order.totalAmount), 'total')}
    `;

  const paymentBlock = buildPaymentSection(order, hasReturns);

  const bodyHtml = `
    <div class="center store-name">${storeName}</div>
    ${storeTagline ? `<div class="center store-sub">${storeTagline}</div>` : ''}
    ${headerContact ? `<div class="center store-contact">${headerContact}</div>` : ''}

    ${dashedLine()}
    <div class="center title">HÓA ĐƠN BÁN HÀNG</div>

    <div class="meta">Số: <strong>${escapeHtml(order.orderNumber)}</strong></div>
    <div class="meta">Ngày: ${formatReceiptDateTime(order.orderDate)}</div>
    ${order.shiftNumber ? `<div class="meta">Ca: ${escapeHtml(order.shiftNumber)}</div>` : ''}
    <div class="meta">Khách: ${escapeHtml(order.customerName ?? 'Khách lẻ')}</div>
    ${hasReturns ? `<div class="meta">TT: ${escapeHtml(statusLabel)}</div>` : ''}

    ${dashedLine()}
    <div class="items">${itemBlocks}</div>
    ${dashedLine()}

    ${totalsBlock}
    ${paymentBlock ? `${dashedLine()}${paymentBlock}` : ''}

    ${order.notes ? `<div class="note">Ghi chú: ${escapeHtml(order.notes)}</div>` : ''}
    ${hasReturns ? '<div class="note">Phiếu in lại sau trả hàng — số lượng là phần còn lại.</div>' : ''}

    ${dashedLine()}
    <div class="footer">
      <div>Cảm ơn quý khách!</div>
      <div>Hẹn gặp lại</div>
      <div class="note" style="margin-top:6px">Phiếu bán lẻ — không phải hóa đơn GTGT</div>
    </div>`;

  return buildThermalReceiptDocument(`HD ${escapeHtml(order.orderNumber)}`, bodyHtml);
}

export async function printSalesInvoice(order: SalesOrderDetail): Promise<boolean> {
  const receiptStore = await loadReceiptStoreSettings();
  const html = buildSalesInvoiceHtml(order, receiptStore);
  return openThermalPrintWindow(html);
}
