import { apiPath } from '@/shared/api/api-base';
import { useAuthStore } from '@/shared/auth/auth.store';

/** Resolve upload URLs for <img src>. Relative /uploads/... must hit the API origin, not the SPA host. */
export function withUploadAuth(url: string | undefined | null): string | undefined {
  if (!url?.trim()) return undefined;
  const trimmed = url.trim();

  let absolute = trimmed;
  if (trimmed.startsWith('/uploads/')) {
    absolute = apiPath(trimmed);
  } else if (trimmed.startsWith('uploads/')) {
    absolute = apiPath(`/${trimmed}`);
  }

  // Product upload endpoints require JWT (query token for <img> which cannot set Authorization).
  if (!absolute.includes('/uploads/products/') && !absolute.includes('/uploads/health-records/')) {
    return absolute;
  }

  const token = useAuthStore.getState().accessToken;
  if (!token) return absolute;

  const separator = absolute.includes('?') ? '&' : '?';
  return `${absolute}${separator}access_token=${encodeURIComponent(token)}`;
}
