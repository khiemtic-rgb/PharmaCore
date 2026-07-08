import { loadStoredTenantCode, saveStoredTenantCode } from '@/shared/config/app-brand';

const TENANT_PARAM = 'tenant';

export function readTenantFromSearchParams(search: string): string {
  const tenant = new URLSearchParams(search).get(TENANT_PARAM)?.trim().toUpperCase() ?? '';
  if (!tenant || !/^[A-Z0-9_]+$/.test(tenant)) {
    return '';
  }
  return tenant;
}

export function resolveInitialTenantCode(search: string): { code: string; locked: boolean } {
  const fromUrl = readTenantFromSearchParams(search);
  if (fromUrl) {
    return { code: fromUrl, locked: true };
  }
  return { code: loadStoredTenantCode(), locked: false };
}

export function applyTenantFromUrl(search: string): { code: string; locked: boolean } {
  const resolved = resolveInitialTenantCode(search);
  if (resolved.locked) {
    saveStoredTenantCode(resolved.code);
  }
  return resolved;
}

export function buildCustomerAppLoginUrl(baseUrl: string, tenantCode: string): string {
  const base = baseUrl.trim().replace(/\/+$/, '');
  const tenant = tenantCode.trim().toUpperCase();
  const url = new URL(`${base}/login`);
  url.searchParams.set(TENANT_PARAM, tenant);
  return url.toString();
}
