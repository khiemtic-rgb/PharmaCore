import axios from 'axios';
import { http } from '@/shared/api/http';

export interface CustomerReceivablesSummary {
  customerId: string;
  customerCode: string;
  customerName: string;
  customerPhone?: string | null;
  totalReceivable: number;
  lines: {
    salesOrderId: string;
    orderNumber: string;
    outstanding: number;
  }[];
}

export type CustomerReceivablesHint = {
  customerCode: string;
  fullName: string;
  phone?: string;
};

export async function fetchCustomerReceivablesDetail(
  customerId: string,
  customerHint?: CustomerReceivablesHint,
): Promise<CustomerReceivablesSummary> {
  try {
    const { data } = await http.get<Record<string, unknown>>(`/sales/customer-receivables/${customerId}`);
    const lines = ((data.lines ?? data.Lines ?? []) as Record<string, unknown>[]).map((line) => ({
      salesOrderId: String(line.salesOrderId ?? line.SalesOrderId),
      orderNumber: String(line.orderNumber ?? line.OrderNumber ?? ''),
      outstanding: Number(line.outstanding ?? line.Outstanding ?? 0),
    }));
    return {
      customerId: String(data.customerId ?? data.CustomerId ?? customerId),
      customerCode: String(data.customerCode ?? data.CustomerCode ?? customerHint?.customerCode ?? ''),
      customerName: String(data.customerName ?? data.CustomerName ?? customerHint?.fullName ?? ''),
      customerPhone: (data.customerPhone ?? data.CustomerPhone ?? customerHint?.phone) as string | null | undefined,
      totalReceivable: Number(data.totalReceivable ?? data.TotalReceivable ?? 0),
      lines,
    };
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404 && customerHint) {
      return {
        customerId,
        customerCode: customerHint.customerCode,
        customerName: customerHint.fullName,
        customerPhone: customerHint.phone ?? null,
        totalReceivable: 0,
        lines: [],
      };
    }
    throw error;
  }
}

export interface CustomerPaymentReceipt {
  id: string;
  paymentNumber: string;
  amount: number;
  paymentMethod: number;
  paymentDate: string;
  customerName: string;
  customerCode?: string;
  orderNumber?: string;
  notes?: string;
}

function normalizePostedPayment(data: Record<string, unknown>): CustomerPaymentReceipt {
  return {
    id: String(data.id ?? data.Id),
    paymentNumber: String(data.paymentNumber ?? data.PaymentNumber ?? ''),
    amount: Number(data.amount ?? data.Amount ?? 0),
    paymentMethod: Number(data.paymentMethod ?? data.PaymentMethod ?? 1),
    paymentDate: String(data.paymentDate ?? data.PaymentDate ?? new Date().toISOString()),
    customerName: String(data.customerName ?? data.CustomerName ?? ''),
    customerCode: (data.customerCode ?? data.CustomerCode) as string | undefined,
    orderNumber: (data.orderNumber ?? data.OrderNumber) as string | undefined,
    notes: (data.notes ?? data.Notes) as string | undefined,
  };
}

export async function createAndPostCustomerPayment(payload: {
  customerId: string;
  amount: number;
  paymentMethod: number;
  salesOrderId?: string;
  notes?: string;
  customerName?: string;
  customerCode?: string;
}): Promise<CustomerPaymentReceipt> {
  const { data: created } = await http.post<Record<string, unknown>>('/sales/customer-payments', {
    customerId: payload.customerId,
    salesOrderId: payload.salesOrderId ?? null,
    amount: payload.amount,
    paymentMethod: payload.paymentMethod,
    notes: payload.notes?.trim() || null,
  });
  const id = String(created.id ?? created.Id);
  const { data: posted } = await http.post<Record<string, unknown>>(`/sales/customer-payments/${id}/post`);
  const receipt = normalizePostedPayment(posted);
  return {
    ...receipt,
    customerName: receipt.customerName || payload.customerName || '',
    customerCode: receipt.customerCode || payload.customerCode,
  };
}
