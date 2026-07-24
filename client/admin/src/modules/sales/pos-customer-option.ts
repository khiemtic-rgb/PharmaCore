import type { CustomerListItem } from '@/shared/api/sales.types';

/** Label shown in POS customer Select — includes phone so cashiers can find by SĐT. */
export function formatPosCustomerOptionLabel(c: {
  customerCode: string;
  fullName: string;
  phone?: string | null;
}): string {
  const phone = (c.phone ?? '').trim();
  const head = `${c.customerCode} — ${c.fullName}`;
  return phone ? `${head} · ${phone}` : head;
}

export function upsertPosCustomers(
  prev: CustomerListItem[],
  ...rows: Array<CustomerListItem | null | undefined>
): CustomerListItem[] {
  const map = new Map(prev.map((c) => [c.id, c]));
  for (const row of rows) {
    if (row) map.set(row.id, row);
  }
  return [...map.values()].sort((a, b) => a.fullName.localeCompare(b.fullName, 'vi'));
}
