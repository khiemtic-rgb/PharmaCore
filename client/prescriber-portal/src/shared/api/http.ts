import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/shared/auth/auth.store';
import { apiPath } from '@/shared/api/api-base';
import { forcePrescriberLogout } from '@/shared/auth/force-logout';

export const prescriberHttp = axios.create({
  baseURL: apiPath('/api/prescriber-portal'),
  headers: { 'Content-Type': 'application/json' },
  timeout: 20_000,
});

prescriberHttp.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

prescriberHttp.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    if (error.response?.status === 401 && original && !original.url?.includes('/auth/')) {
      if (original._retry) {
        forcePrescriberLogout();
        return Promise.reject(error);
      }
      original._retry = true;
      forcePrescriberLogout();
    }
    return Promise.reject(error);
  },
);
