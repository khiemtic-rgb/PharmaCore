import { QueryClient } from '@tanstack/react-query';

import { OVERVIEW_GC_MS, OVERVIEW_STALE_MS } from '@/shared/api/overview-queries';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: OVERVIEW_STALE_MS,
      gcTime: OVERVIEW_GC_MS,
      retry: 1,
      refetchOnWindowFocus: true,
    },
  },
});
