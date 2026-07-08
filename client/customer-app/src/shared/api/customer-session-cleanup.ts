import { clearOverviewCache } from '@/shared/api/overview-cache';
import { resetCustomerOverviewQueries } from '@/shared/api/overview-queries';
import { queryClient } from '@/shared/api/query-client';

export function clearCustomerCachedData() {
  clearOverviewCache();
  resetCustomerOverviewQueries(queryClient);
}
