import { clearCustomerCachedData } from '@/shared/api/customer-session-cleanup';
import { useAuthStore } from '@/shared/auth/auth.store';

/** Xóa session khách hàng và quay về login (tránh kẹt màn hình với token hết hạn). */
export function forceCustomerLogout() {
  clearCustomerCachedData();
  useAuthStore.getState().clearSession();
  if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
}
