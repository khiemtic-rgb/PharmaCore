import type { CustomerDraftOrderListItem } from '@/shared/api/customer-app.types';

type DraftOrderAlertListener = (drafts: CustomerDraftOrderListItem[]) => void;

const listeners = new Set<DraftOrderAlertListener>();

export function subscribeDraftOrderAlerts(listener: DraftOrderAlertListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function emitDraftOrderAlerts(drafts: CustomerDraftOrderListItem[]) {
  if (drafts.length === 0) return;
  listeners.forEach((listener) => listener(drafts));
}
