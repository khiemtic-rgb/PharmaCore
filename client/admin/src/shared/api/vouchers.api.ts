import { http } from '@/shared/api/http';

export interface VoucherAdmin {
  id: string;
  voucherCode: string;
  voucherName: string;
  discountType: number;
  discountValue: number;
  minOrderAmount: number;
  maxUses?: number | null;
  usedCount: number;
  validFrom: string;
  validTo: string;
  status: number;
  issuedCount: number;
}

export interface IssuedCustomerVoucher {
  customerVoucherId: string;
  customerId: string;
  customerName: string;
  customerPhone?: string | null;
  issuedAt: string;
  usedAt?: string | null;
}

export const VOUCHER_DISCOUNT_TYPE = {
  Percent: 1,
  Fixed: 2,
} as const;

export const VOUCHER_STATUS = {
  Active: 1,
  Inactive: 0,
} as const;

export const VOUCHER_STATUS_LABELS: Record<number, string> = {
  1: 'Đang dùng',
  0: 'Tắt',
};

export const VOUCHER_DISCOUNT_TYPE_LABELS: Record<number, string> = {
  1: 'Phần trăm',
  2: 'Số tiền cố định',
};

function normalizeVoucher(row: Record<string, unknown>): VoucherAdmin {
  return {
    id: String(row.id ?? row.Id),
    voucherCode: String(row.voucherCode ?? row.VoucherCode ?? ''),
    voucherName: String(row.voucherName ?? row.VoucherName ?? ''),
    discountType: Number(row.discountType ?? row.DiscountType ?? 2),
    discountValue: Number(row.discountValue ?? row.DiscountValue ?? 0),
    minOrderAmount: Number(row.minOrderAmount ?? row.MinOrderAmount ?? 0),
    maxUses: (row.maxUses ?? row.MaxUses) as number | null | undefined,
    usedCount: Number(row.usedCount ?? row.UsedCount ?? 0),
    validFrom: String(row.validFrom ?? row.ValidFrom ?? ''),
    validTo: String(row.validTo ?? row.ValidTo ?? ''),
    status: Number(row.status ?? row.Status ?? 1),
    issuedCount: Number(row.issuedCount ?? row.IssuedCount ?? 0),
  };
}

function normalizeIssued(row: Record<string, unknown>): IssuedCustomerVoucher {
  return {
    customerVoucherId: String(row.customerVoucherId ?? row.CustomerVoucherId ?? ''),
    customerId: String(row.customerId ?? row.CustomerId ?? ''),
    customerName: String(row.customerName ?? row.CustomerName ?? ''),
    customerPhone: (row.customerPhone ?? row.CustomerPhone) as string | null | undefined,
    issuedAt: String(row.issuedAt ?? row.IssuedAt ?? ''),
    usedAt: (row.usedAt ?? row.UsedAt) as string | null | undefined,
  };
}

export async function fetchVouchersAdmin() {
  const { data } = await http.get<{ items?: Record<string, unknown>[]; Items?: Record<string, unknown>[] }>(
    '/loyalty/vouchers',
  );
  const rows = data.items ?? data.Items ?? [];
  return rows.map(normalizeVoucher);
}

export async function createVoucherAdmin(payload: {
  voucherCode: string;
  voucherName: string;
  discountType: number;
  discountValue: number;
  minOrderAmount: number;
  maxUses?: number | null;
  validFrom: string;
  validTo: string;
  status: number;
}) {
  const { data } = await http.post<Record<string, unknown>>('/loyalty/vouchers', payload);
  return normalizeVoucher(data);
}

export async function updateVoucherAdmin(
  id: string,
  payload: {
    voucherCode: string;
    voucherName: string;
    discountType: number;
    discountValue: number;
    minOrderAmount: number;
    maxUses?: number | null;
    validFrom: string;
    validTo: string;
    status: number;
  },
) {
  const { data } = await http.put<Record<string, unknown>>(`/loyalty/vouchers/${id}`, payload);
  return normalizeVoucher(data);
}

export async function issueVoucherAdmin(voucherId: string, customerId: string) {
  await http.post(`/loyalty/vouchers/${voucherId}/issue`, { customerId });
}

export interface VoucherIssueCandidate {
  id: string;
  customerCode: string;
  fullName: string;
  phone: string;
  tierName?: string | null;
  periodRevenue?: number | null;
  dateOfBirth?: string | null;
  alreadyIssued: boolean;
}

export interface VoucherIssueCandidateSearchPayload {
  search?: string;
  revenueEnabled: boolean;
  revenueFrom?: string;
  revenueTo?: string;
  minRevenue?: number;
  birthdayEnabled: boolean;
  birthdayFromMonth?: number;
  birthdayFromDay?: number;
  birthdayToMonth?: number;
  birthdayToDay?: number;
  tierEnabled: boolean;
  tierIds?: string[];
  excludeAlreadyIssued: boolean;
  page?: number;
  pageSize?: number;
}

export interface VoucherIssueCandidateListResult {
  items: VoucherIssueCandidate[];
  total: number;
  page: number;
  pageSize: number;
}

export interface IssueVoucherBulkResult {
  issuedCount: number;
  skippedAlreadyHad: number;
  invalidCount: number;
}

function normalizeIssueCandidate(row: Record<string, unknown>): VoucherIssueCandidate {
  return {
    id: String(row.id ?? row.Id),
    customerCode: String(row.customerCode ?? row.CustomerCode ?? ''),
    fullName: String(row.fullName ?? row.FullName ?? ''),
    phone: String(row.phone ?? row.Phone ?? ''),
    tierName: (row.tierName ?? row.TierName) as string | null | undefined,
    periodRevenue:
      row.periodRevenue != null || row.PeriodRevenue != null
        ? Number(row.periodRevenue ?? row.PeriodRevenue)
        : null,
    dateOfBirth: (row.dateOfBirth ?? row.DateOfBirth) as string | null | undefined,
    alreadyIssued: Boolean(row.alreadyIssued ?? row.AlreadyIssued),
  };
}

export async function searchVoucherIssueCandidates(
  voucherId: string,
  payload: VoucherIssueCandidateSearchPayload,
): Promise<VoucherIssueCandidateListResult> {
  const { data } = await http.post<Record<string, unknown>>(
    `/loyalty/vouchers/${voucherId}/issue-candidates/search`,
    payload,
  );
  const itemsRaw = (data.items ?? data.Items ?? []) as Record<string, unknown>[];
  return {
    items: itemsRaw.map(normalizeIssueCandidate),
    total: Number(data.total ?? data.Total ?? 0),
    page: Number(data.page ?? data.Page ?? payload.page ?? 1),
    pageSize: Number(data.pageSize ?? data.PageSize ?? payload.pageSize ?? 50),
  };
}

export async function issueVoucherBulkAdmin(
  voucherId: string,
  customerIds: string[],
): Promise<IssueVoucherBulkResult> {
  const { data } = await http.post<Record<string, unknown>>(
    `/loyalty/vouchers/${voucherId}/issue-bulk`,
    { customerIds },
  );
  return {
    issuedCount: Number(data.issuedCount ?? data.IssuedCount ?? 0),
    skippedAlreadyHad: Number(data.skippedAlreadyHad ?? data.SkippedAlreadyHad ?? 0),
    invalidCount: Number(data.invalidCount ?? data.InvalidCount ?? 0),
  };
}

export async function fetchIssuedVouchersAdmin(voucherId: string) {
  const { data } = await http.get<{ items?: Record<string, unknown>[]; Items?: Record<string, unknown>[] }>(
    `/loyalty/vouchers/${voucherId}/issued`,
  );
  const rows = data.items ?? data.Items ?? [];
  return rows.map(normalizeIssued);
}

export async function deleteVoucherAdmin(id: string) {
  await http.delete(`/loyalty/vouchers/${id}`);
}
