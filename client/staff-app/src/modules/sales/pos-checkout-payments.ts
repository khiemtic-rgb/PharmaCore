import { SALES_PAYMENT_CASH, SALES_PAYMENT_CREDIT, type PosCheckoutPaymentLine } from '@/shared/api/sales.types';
import { roundMoney } from '@/modules/sales/pos-pricing';

export function defaultPayments(total: number): PosCheckoutPaymentLine[] {
  return [{ paymentMethod: SALES_PAYMENT_CASH, amount: total }];
}

export function isSingleCashPayment(rows: PosCheckoutPaymentLine[]): boolean {
  return rows.length === 1 && Number(rows[0]?.paymentMethod) === SALES_PAYMENT_CASH;
}

export function sumNonCreditPayments(rows: PosCheckoutPaymentLine[]): number {
  return rows
    .filter((row) => Number(row.paymentMethod) !== SALES_PAYMENT_CREDIT)
    .reduce((sum, row) => sum + Number(row?.amount ?? 0), 0);
}

export function sumCreditPaymentRows(rows: PosCheckoutPaymentLine[]): number {
  return rows
    .filter((row) => Number(row.paymentMethod) === SALES_PAYMENT_CREDIT)
    .reduce((sum, row) => sum + Number(row?.amount ?? 0), 0);
}

export function rebalanceFirstRow(rows: PosCheckoutPaymentLine[], totalAmount: number): PosCheckoutPaymentLine[] {
  if (rows.length < 2) return rows;
  const rest = rows.slice(1).reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
  const firstAmount = Math.max(0, totalAmount - rest);
  return [{ ...rows[0], amount: firstAmount }, ...rows.slice(1)];
}

export function computeAppliedPayment(rows: PosCheckoutPaymentLine[], payableTotal: number): number {
  if (rows.length === 0) return 0;
  if (isSingleCashPayment(rows)) {
    return Math.min(Number(rows[0]?.amount ?? 0), payableTotal);
  }
  return Math.min(sumNonCreditPayments(rows), payableTotal);
}

export function normalizePaymentsForApi(
  rows: PosCheckoutPaymentLine[],
  payableTotal: number,
): PosCheckoutPaymentLine[] {
  if (rows.length === 0) return [];
  if (isSingleCashPayment(rows)) {
    const applied = computeAppliedPayment(rows, payableTotal);
    if (applied <= 0.009) return [];
    return [{ paymentMethod: SALES_PAYMENT_CASH, amount: applied }];
  }
  return rows
    .map((row) => ({
      paymentMethod: Number(row.paymentMethod),
      amount: Number(row.amount ?? 0),
    }))
    .filter((row) => row.amount > 0.009 && row.paymentMethod !== SALES_PAYMENT_CREDIT);
}

export function computeCreditAmount(
  rows: PosCheckoutPaymentLine[],
  payableTotal: number,
  isFreeOrder: boolean,
): number {
  if (isFreeOrder) return 0;
  const paidTotal = computeAppliedPayment(rows, payableTotal);
  const explicitCredit = roundMoney(sumCreditPaymentRows(rows));
  const implicitCredit = roundMoney(Math.max(0, payableTotal - paidTotal));
  return explicitCredit > 0.009 ? explicitCredit : implicitCredit;
}

export function paymentsAreValid(
  rows: PosCheckoutPaymentLine[],
  payableTotal: number,
  options: { customerId?: string; allowCredit: boolean },
): boolean {
  if (payableTotal < 0.01) return true;
  if (rows.length === 0) return false;

  const cashPaid = computeAppliedPayment(rows, payableTotal);
  const creditRows = roundMoney(sumCreditPaymentRows(rows));

  if (cashPaid > payableTotal + 0.009) return false;

  if (creditRows > 0.009) {
    if (Math.abs(cashPaid + creditRows - payableTotal) > 0.01) return false;
    return Boolean(options.customerId && options.allowCredit);
  }

  if (Math.abs(cashPaid - payableTotal) < 0.01) return true;

  if (cashPaid < payableTotal - 0.009) {
    return Boolean(options.customerId && options.allowCredit);
  }

  return false;
}
