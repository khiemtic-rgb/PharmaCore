export const SITE_URL = 'https://novixa.vn';
export const SITE_NAME = 'Novixa';
export const DEFAULT_OG_IMAGE = '/og-novixa.svg';

export function absoluteUrl(path: string): string {
  if (path.startsWith('http')) return path;
  const withSlash = path.startsWith('/') ? path : `/${path}`;
  // Canonicals must match Cloudflare Pages live URLs (trailing slash).
  const normalized =
    withSlash === '/' || withSlash.endsWith('/') || withSlash.includes('.')
      ? withSlash
      : `${withSlash}/`;
  return `${SITE_URL}${normalized}`;
}
