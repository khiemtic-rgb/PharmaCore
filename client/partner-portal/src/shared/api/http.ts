import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/shared/auth/auth.store';
import { apiPath } from '@/shared/api/api-base';
import { forcePartnerLogout } from '@/shared/auth/force-logout';

export const partnerHttp = axios.create({
  baseURL: apiPath('/api/partner-portal'),
  headers: { 'Content-Type': 'application/json' },
  timeout: 15_000,
});

partnerHttp.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

partnerHttp.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    if (error.response?.status === 401 && original && !original.url?.includes('/auth/')) {
      forcePartnerLogout();
    }
    return Promise.reject(error);
  },
);
