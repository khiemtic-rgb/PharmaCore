import { useAuthStore } from '@/shared/auth/auth.store';

const TTL_MS = 5 * 60 * 1000;

type CacheEntry<T> = { at: number; data: T };

function accountScope(): string {
  const profile = useAuthStore.getState().profile;
  if (!profile) return 'anon';
  return `${profile.tenantCode}:${profile.customerId}`;
}

function storageKey(key: string) {
  return `kitplatform.overview.${key}.${accountScope()}`;
}

/** Session cache for overview payloads — show stale data instantly, refresh in background. */
export function readOverviewCache<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(storageKey(key));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry<T>;
    if (Date.now() - parsed.at > TTL_MS) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

export function writeOverviewCache<T>(key: string, data: T) {
  try {
    const entry: CacheEntry<T> = { at: Date.now(), data };
    sessionStorage.setItem(storageKey(key), JSON.stringify(entry));
  } catch {
    // quota / private mode
  }
}

export function clearOverviewCache(key?: string) {
  try {
    if (key) {
      sessionStorage.removeItem(storageKey(key));
      return;
    }
    const prefix = `kitplatform.overview.`;
    const suffix = `.${accountScope()}`;
    for (let i = sessionStorage.length - 1; i >= 0; i -= 1) {
      const k = sessionStorage.key(i);
      if (k?.startsWith(prefix) && k.endsWith(suffix)) {
        sessionStorage.removeItem(k);
      }
    }
  } catch {
    // ignore
  }
}

export const OVERVIEW_CACHE_KEYS = {
  orders: 'orders',
  reminders: 'reminders',
  chat: 'chat',
} as const;
