import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/shared/auth/auth.store';
import type { CustomerLoginResponse } from '@/shared/api/customer-app.types';

export const http = axios.create({
  baseURL: '/api/customer-app',
  headers: { 'Content-Type': 'application/json' },
  timeout: 30_000,
});

http.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshPromise: Promise<string | null> | null = null;

http.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    const status = error.response?.status;

    if (status === 401 && original && !original._retry && !original.url?.includes('/auth/')) {
      original._retry = true;

      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
      }

      const newToken = await refreshPromise;
      if (!newToken) {
        useAuthStore.getState().clearSession();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      original.headers.Authorization = `Bearer ${newToken}`;
      return http(original);
    }

    return Promise.reject(error);
  },
);

async function refreshAccessToken(): Promise<string | null> {
  const { refreshToken, setSession, clearSession } = useAuthStore.getState();
  if (!refreshToken) {
    clearSession();
    return null;
  }

  try {
    const { data } = await axios.post<CustomerLoginResponse>('/api/customer-app/auth/refresh', {
      refreshToken,
    });
    setSession(data);
    return data.accessToken;
  } catch {
    clearSession();
    return null;
  }
}
