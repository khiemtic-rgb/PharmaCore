export interface CustomerAdminListItem {
  id: string;
  customerCode: string;
  fullName: string;
  phone: string;
  hasAppAccount?: boolean;
  allowCredit?: boolean;
  creditLimit?: number | null;
  currentOutstanding?: number;
}

export interface CustomerDetail extends CustomerAdminListItem {
  email?: string | null;
  status?: number;
}

export interface UpdateCustomerCreditPayload {
  allowCredit: boolean;
  creditLimit?: number | null;
}

export interface CreateCustomerPayload {
  fullName: string;
  phone: string;
}

export interface CustomerPilotOtpStatus {
  enabled: boolean;
  code: string | null;
  expiresAt: string | null;
  createdAt: string | null;
}

export interface PagedCustomersResult {
  items: CustomerAdminListItem[];
  total: number;
}
