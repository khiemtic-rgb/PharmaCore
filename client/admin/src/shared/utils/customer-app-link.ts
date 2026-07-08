export function buildCustomerAppLoginUrl(baseUrl: string, tenantCode: string): string {
  const base = baseUrl.trim().replace(/\/+$/, '');
  const tenant = tenantCode.trim().toUpperCase();
  const url = new URL(`${base}/login`);
  url.searchParams.set('tenant', tenant);
  return url.toString();
}
