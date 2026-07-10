import { QueryClient } from '@tanstack/react-query';
import axios from 'axios';

import { OVERVIEW_GC_MS, OVERVIEW_STALE_MS } from '@/shared/api/overview-queries';

function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    if (status === 401 || status === 403 || status === 404) return false;
  }
  return failureCount < 1;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: OVERVIEW_STALE_MS,
      gcTime: OVERVIEW_GC_MS,
      retry: shouldRetryQuery,
      refetchOnWindowFocus: true,
    },
  },
});
