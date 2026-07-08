import { http } from '@/shared/api/http';
import type {
  CreateCustomerPayload,
  CustomerAdminListItem,
  CustomerDetail,
  CustomerPilotOtpStatus,
  PagedCustomersResult,
  UpdateCustomerCreditPayload,
} from '@/shared/api/customer.types';

export async function fetchCustomerList(search?: string, pageSize = 30): Promise<PagedCustomersResult> {
  const { data } = await http.get<Record<string, unknown>>('/customers', {
    params: { search, page: 1, pageSize },
  });
  const items = ((data.items ?? data.Items ?? []) as Record<string, unknown>[]).map(
    (row): CustomerAdminListItem => ({
      id: String(row.id ?? row.Id),
      customerCode: String(row.customerCode ?? row.CustomerCode ?? ''),
      fullName: String(row.fullName ?? row.FullName ?? ''),
      phone: String(row.phone ?? row.Phone ?? ''),
      hasAppAccount: Boolean(row.hasAppAccount ?? row.HasAppAccount),
      allowCredit: Boolean(row.allowCredit ?? row.AllowCredit),
    }),
  );
  return {
    items,
    total: Number(data.total ?? data.Total ?? items.length),
  };
}

export async function fetchCustomerDetail(customerId: string): Promise<CustomerDetail> {
  const { data } = await http.get<Record<string, unknown>>(`/customers/${customerId}`);
  return {
    id: String(data.id ?? data.Id),
    customerCode: String(data.customerCode ?? data.CustomerCode ?? ''),
    fullName: String(data.fullName ?? data.FullName ?? ''),
    phone: String(data.phone ?? data.Phone ?? ''),
    hasAppAccount: Boolean(data.hasAppAccount ?? data.HasAppAccount),
    allowCredit: Boolean(data.allowCredit ?? data.AllowCredit),
    creditLimit:
      data.creditLimit != null || data.CreditLimit != null
        ? Number(data.creditLimit ?? data.CreditLimit)
        : null,
    email: (data.email ?? data.Email) as string | null | undefined,
    status: Number(data.status ?? data.Status ?? 1),
  };
}

export async function fetchCustomerById(customerId: string): Promise<CustomerDetail> {
  return fetchCustomerDetail(customerId);
}

/** Cập nhật ghi nợ — cần sales.write; giữ nguyên các trường CRM khác. */
export async function updateCustomerCreditSettings(
  customerId: string,
  payload: UpdateCustomerCreditPayload,
): Promise<CustomerDetail> {
  const current = await fetchCustomerDetail(customerId);
  const { data } = await http.put<Record<string, unknown>>(`/customers/${customerId}`, {
    fullName: current.fullName,
    phone: current.phone,
    customerCode: current.customerCode,
    email: current.email ?? null,
    status: current.status ?? 1,
    allowCredit: payload.allowCredit,
    creditLimit: payload.allowCredit ? payload.creditLimit ?? null : null,
  });
  return {
    id: String(data.id ?? data.Id),
    customerCode: String(data.customerCode ?? data.CustomerCode ?? ''),
    fullName: String(data.fullName ?? data.FullName ?? ''),
    phone: String(data.phone ?? data.Phone ?? ''),
    hasAppAccount: Boolean(data.hasAppAccount ?? data.HasAppAccount),
    allowCredit: Boolean(data.allowCredit ?? data.AllowCredit),
    creditLimit:
      data.creditLimit != null || data.CreditLimit != null
        ? Number(data.creditLimit ?? data.CreditLimit)
        : null,
    email: (data.email ?? data.Email) as string | null | undefined,
    status: Number(data.status ?? data.Status ?? 1),
  };
}

export async function createCustomer(payload: CreateCustomerPayload): Promise<CustomerDetail> {
  const { data } = await http.post<Record<string, unknown>>('/customers', payload);
  return {
    id: String(data.id ?? data.Id),
    customerCode: String(data.customerCode ?? data.CustomerCode ?? ''),
    fullName: String(data.fullName ?? data.FullName ?? ''),
    phone: String(data.phone ?? data.Phone ?? ''),
    hasAppAccount: Boolean(data.hasAppAccount ?? data.HasAppAccount),
    allowCredit: Boolean(data.allowCredit ?? data.AllowCredit),
  };
}

export async function fetchCustomerPilotOtp(customerId: string): Promise<CustomerPilotOtpStatus> {
  const { data } = await http.get<Record<string, unknown>>(`/customers/${customerId}/pilot-otp`);
  return {
    enabled: Boolean(data.enabled ?? data.Enabled),
    code: (data.code ?? data.Code) != null ? String(data.code ?? data.Code) : null,
    expiresAt: (data.expiresAt ?? data.ExpiresAt) as string | null,
    createdAt: (data.createdAt ?? data.CreatedAt) as string | null,
  };
}
