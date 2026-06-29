export type CustomerPaymentPrefill = {
  customerId: string;
  salesOrderId?: string;
  amount?: number;
};

export function buildCustomerPaymentCreateUrl(prefill: CustomerPaymentPrefill): string {
  const params = new URLSearchParams();
  params.set('create', '1');
  params.set('customerId', prefill.customerId);
  if (prefill.salesOrderId) params.set('salesOrderId', prefill.salesOrderId);
  if (prefill.amount != null && prefill.amount > 0) {
    params.set('amount', String(Math.round(prefill.amount)));
  }
  return `/sales/customer-payments?${params.toString()}`;
}

export function parseCustomerPaymentPrefill(searchParams: URLSearchParams): CustomerPaymentPrefill | null {
  if (searchParams.get('create') !== '1') return null;
  const customerId = searchParams.get('customerId');
  if (!customerId) return null;

  const amountRaw = searchParams.get('amount');
  const parsedAmount = amountRaw != null && amountRaw !== '' ? Number(amountRaw) : undefined;

  return {
    customerId,
    salesOrderId: searchParams.get('salesOrderId') ?? undefined,
    amount: parsedAmount != null && !Number.isNaN(parsedAmount) ? parsedAmount : undefined,
  };
}
