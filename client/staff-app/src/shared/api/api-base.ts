const NOVIXA_API_ORIGIN = 'https://api.novixa.vn';

const NOVIXA_APP_HOSTS = new Set([
  'admin.novixa.vn',
  'app.novixa.vn',
  'pos.novixa.vn',
]);

function resolveNovixaApiFromHost(): string {
  if (typeof window === 'undefined') return '';
  return NOVIXA_APP_HOSTS.has(window.location.hostname) ? NOVIXA_API_ORIGIN : '';
}

export function resolveApiOrigin(): string {
  const fromEnv = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');
  if (fromEnv) return fromEnv;
  return resolveNovixaApiFromHost();
}

export function apiPath(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  const origin = resolveApiOrigin();
  return origin ? `${origin}${normalized}` : normalized;
}
