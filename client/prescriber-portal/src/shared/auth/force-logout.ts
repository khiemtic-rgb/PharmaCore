import { useAuthStore } from '@/shared/auth/auth.store';

export function forcePrescriberLogout() {
  useAuthStore.getState().clearSession();
  if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
    window.location.assign('/login');
  }
}
