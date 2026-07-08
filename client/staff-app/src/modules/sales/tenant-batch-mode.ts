import type { TenantBatchModeValue } from '@/shared/api/sales.types';

export function enablesShiftFefoLotAlerts(mode: TenantBatchModeValue): boolean {
  return mode === 'label_required';
}
