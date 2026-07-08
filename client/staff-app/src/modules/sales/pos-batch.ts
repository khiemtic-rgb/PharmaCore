import type { CartLine, TenantBatchModeValue } from '@/shared/api/sales.types';

export function suggestedBatchHint(hints?: CartLine['batchHints']) {
  return hints?.find((h) => h.isSuggested) ?? hints?.[0];
}

export function defaultBatchLabel(hints?: CartLine['batchHints']): string | undefined {
  return suggestedBatchHint(hints)?.batchNumber;
}

export function showsBatchHints(mode: TenantBatchModeValue): boolean {
  return mode === 'suggest';
}

export function showsBatchLabelField(mode: TenantBatchModeValue): boolean {
  return mode === 'label_optional' || mode === 'label_required';
}

export function showsBatchPicker(mode: TenantBatchModeValue, hints?: CartLine['batchHints']): boolean {
  if (mode === 'off' || !hints?.length) return false;
  return showsBatchHints(mode) || showsBatchLabelField(mode);
}

export function requiresBatchLabel(mode: TenantBatchModeValue): boolean {
  return mode === 'label_required';
}

export function batchLabelMatchesHints(label: string, hints?: CartLine['batchHints']): boolean {
  const normalized = label.trim().toLowerCase();
  if (!normalized) return false;
  return hints?.some((h) => h.batchNumber.trim().toLowerCase() === normalized) ?? false;
}

export function validateCartBatchLabels(cart: CartLine[], mode: TenantBatchModeValue): string | null {
  if (!showsBatchLabelField(mode)) return null;

  for (const line of cart) {
    const label = line.batchLabel?.trim() ?? '';
    if (requiresBatchLabel(mode) && !label) {
      return `Chọn lô cho "${line.productName}"`;
    }
    if (label && !batchLabelMatchesHints(label, line.batchHints)) {
      return `Lô "${label}" không khớp tồn kho — "${line.productName}"`;
    }
  }

  return null;
}
