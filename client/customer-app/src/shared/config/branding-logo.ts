const DEFAULT_LOGO = '/icon-512.png';

export function resolveBrandingLogoUrl(logoUrl: string | null | undefined): string {
  const raw = logoUrl?.trim();
  if (!raw) return DEFAULT_LOGO;
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
  if (raw.startsWith('/customer-app/')) {
    return raw.replace(/^\/customer-app/, '') || DEFAULT_LOGO;
  }
  return raw;
}
