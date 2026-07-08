export const APP_BRAND = import.meta.env.VITE_APP_BRAND?.trim() || 'Novixa';
export const TENANT_CODE_STORAGE_KEY = 'novixa_staff_tenant_code';

export function loadStoredTenantCode(): string {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem(TENANT_CODE_STORAGE_KEY)?.trim() ?? '';
}

export function saveStoredTenantCode(code: string): void {
  const trimmed = code.trim().toUpperCase();
  if (!trimmed) {
    window.localStorage.removeItem(TENANT_CODE_STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(TENANT_CODE_STORAGE_KEY, trimmed);
}
