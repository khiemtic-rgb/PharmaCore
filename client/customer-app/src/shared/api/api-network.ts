import { resolveApiOrigin } from '@/shared/api/api-base';

export function isProductionApi(): boolean {
  return Boolean(resolveApiOrigin());
}

export function apiNetworkLabel(): string {
  return resolveApiOrigin() || 'http://localhost:5290';
}

/** Gợi ý khi API offline — dev vs production. */
export function apiOfflineHint(): string {
  if (import.meta.env.DEV) {
    return 'Chạy npm run dev hoặc .\\scripts\\restart-api.ps1.';
  }
  return 'Kiểm tra mạng hoặc thử lại sau vài giây. Liên hệ nhà thuốc nếu vẫn lỗi.';
}

export function apiOfflineHintEn(): string {
  if (import.meta.env.DEV) {
    return 'Run npm run dev or .\\scripts\\restart-api.ps1.';
  }
  return 'Check your connection and try again. Contact the pharmacy if the issue persists.';
}
