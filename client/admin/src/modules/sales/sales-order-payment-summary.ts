import type { SalesOrderDetail, SalesPaymentLine } from '@/shared/api/sales.types';

/** Khớp backend SalesPaymentMethods.Credit — không lưu vào sales_payments. */
export const SALES_PAYMENT_METHOD_CREDIT = 5;

export type OrderPaymentSummary = {
  amountPaid: number;
  outstanding: number;
  hasOutstanding: boolean;
};

type OrderPaymentSource = Pick<
  SalesOrderDetail,
  'totalAmount' | 'amountPaid' | 'outstanding' | 'payments'
>;

export function sumCashPaymentsFromLines(payments: SalesPaymentLine[] | undefined): number {
  return (payments ?? [])
    .filter((p) => p.paymentMethod !== SALES_PAYMENT_METHOD_CREDIT)
    .reduce((sum, p) => sum + p.amount, 0);
}

/** Nguồn chung: amount_paid / outstanding trên đơn (AR bước 1). */
export function resolveOrderPaymentSummary(order: OrderPaymentSource): OrderPaymentSummary {
  const payments = order.payments ?? [];
  const explicitPaid = order.amountPaid;
  const explicitOutstanding = order.outstanding;

  if (explicitPaid != null && explicitOutstanding != null) {
    return {
      amountPaid: explicitPaid,
      outstanding: explicitOutstanding,
      hasOutstanding: explicitOutstanding > 0.009,
    };
  }

  const cashFromPayments = sumCashPaymentsFromLines(payments);
  const amountPaid =
    explicitPaid ??
    (payments.length > 0 ? cashFromPayments : order.totalAmount);
  const outstanding =
    explicitOutstanding ?? Math.max(0, order.totalAmount - amountPaid);

  return {
    amountPaid,
    outstanding,
    hasOutstanding: outstanding > 0.009,
  };
}
