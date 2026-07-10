export function apiPath(path: string) {
  const base = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ?? '';
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}
