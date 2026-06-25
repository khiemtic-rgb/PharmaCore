import axios from 'axios';
import { http } from '@/shared/api/http';
import type {
  CreateMedicationReminderRequest,
  CustomerLoginResponse,
  CustomerProfile,
  CustomerVoucherList,
  LoyaltySummary,
  MedicationReminder,
  MedicationReminderList,
  PagedLoyaltyTransactions,
  UpdateMedicationReminderRequest,
} from '@/shared/api/customer-app.types';
import { normalizeReminder, normalizeReminderList } from '@/shared/api/reminder-normalize';

export async function requestOtp(phone: string, tenantCode: string) {
  const { data } = await http.post<{ expiresInSeconds: number; message: string }>('/auth/request-otp', {
    phone,
    tenantCode,
  });
  return data;
}

export async function verifyOtp(phone: string, code: string, tenantCode: string) {
  const { data } = await http.post<CustomerLoginResponse>('/auth/verify-otp', {
    phone,
    code,
    tenantCode,
  });
  return data;
}

export async function logoutApi(refreshToken: string) {
  await http.post('/auth/logout', { refreshToken });
}

export async function fetchProfile() {
  const { data } = await http.get<CustomerProfile>('/auth/me');
  return data;
}

export async function fetchLoyaltySummary() {
  const { data } = await http.get<LoyaltySummary>('/loyalty/summary');
  return data;
}

export async function fetchLoyaltyTransactions(page = 1, pageSize = 20) {
  const { data } = await http.get<PagedLoyaltyTransactions>('/loyalty/transactions', {
    params: { page, pageSize },
  });
  return data;
}

export async function fetchVouchers(includeUsed = false) {
  const { data } = await http.get<CustomerVoucherList>('/loyalty/vouchers', {
    params: { includeUsed },
  });
  return data;
}

export async function fetchReminders(includeInactive = false) {
  const { data } = await http.get<MedicationReminderList>('/reminders', {
    params: { includeInactive },
  });
  return { items: normalizeReminderList(data) };
}

export async function createReminder(payload: CreateMedicationReminderRequest) {
  const { data } = await http.post<Record<string, unknown>>('/reminders', payload);
  return normalizeReminder(data);
}

export async function updateReminder(id: string, payload: UpdateMedicationReminderRequest) {
  const { data } = await http.put<Record<string, unknown>>(`/reminders/${id}`, payload);
  return normalizeReminder(data);
}

export async function deactivateReminder(id: string) {
  await http.delete(`/reminders/${id}`);
}

export function getApiErrorMessage(error: unknown, fallback = 'Đã có lỗi xảy ra') {
  if (axios.isAxiosError(error)) {
    if (!error.response) {
      return 'Không kết nối được API. Chạy run-dev.bat hoặc .\\scripts\\restart-api.ps1 trước.';
    }
    const msg = error.response.data as { message?: string } | undefined;
    return msg?.message ?? fallback;
  }
  return fallback;
}
