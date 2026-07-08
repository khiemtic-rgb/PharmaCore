import axios from 'axios';

import { resolveApiOrigin } from '@/shared/api/api-base';



function networkErrorMessage(): string {

  const origin = resolveApiOrigin();

  if (!origin) {

    return 'Không kết nối được API. Chạy run-dev.bat (API port 5290) rồi thử lại.';

  }

  return 'Không kết nối được API. Kiểm tra mạng Wi‑Fi/4G hoặc thử lại sau vài giây.';

}



export function apiErrorMessage(error: unknown, fallback: string): string {

  if (axios.isAxiosError(error)) {

    if (!error.response) {

      return networkErrorMessage();

    }

    const data = error.response.data as { message?: string; Message?: string; title?: string } | undefined;

    const raw = data?.message ?? data?.Message ?? data?.title;

    if (error.response.status === 404 && (!raw || raw === 'Not Found')) {

      return fallback;

    }

    if (error.response.status >= 502) {

      return 'API đang bảo trì hoặc khởi động lại. Thử lại sau vài giây.';

    }

    return raw ?? fallback;

  }

  if (error instanceof Error && error.message) return error.message;

  return fallback;

}

