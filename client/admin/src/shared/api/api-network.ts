import { resolveApiOrigin } from '@/shared/api/api-base';

/** URL API hiển thị cho người dùng (dev proxy hoặc production). */
export function apiNetworkLabel(): string {
  return resolveApiOrigin() || 'http://localhost:5290';
}

export function isProductionApi(): boolean {
  return Boolean(resolveApiOrigin());
}

export function apiOfflineMessage(): string {
  if (!isProductionApi()) {
    return 'Không kết nối được API (localhost:5290). Chạy npm run dev hoặc .\\scripts\\restart-api.ps1.';
  }
  return `Không kết nối được ${apiNetworkLabel()}. Thử lại sau vài giây hoặc restart dịch vụ API trên VPS.`;
}

export function apiHealthBannerMessage(): string {
  if (!isProductionApi()) {
    return 'API backend không phản hồi (port 5290)';
  }
  return `API backend không phản hồi (${apiNetworkLabel()})`;
}

export function apiHealthBannerDescription(): string {
  if (!isProductionApi()) {
    return 'API port 5290 chưa phản hồi. Chạy npm run dev (tự động bật API) hoặc .\\scripts\\restart-api.ps1.';
  }
  return 'API có thể đang khởi động lại sau deploy. Thử "Kiểm tra lại" hoặc trên VPS: systemctl restart kit-platform-api.';
}

export function apiServerErrorMessage(): string {
  return 'API đang bảo trì hoặc khởi động lại. Thử lại sau vài giây.';
}
