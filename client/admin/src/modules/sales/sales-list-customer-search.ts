export function normalizePhoneDigits(value: string): string {
  return value.replace(/\D/g, '');
}

/** Chuẩn hóa SĐT VN để so khớp (bỏ +84, số 0 đầu). */
export function phoneMatchKey(value: string): string {
  let digits = normalizePhoneDigits(value);
  if (digits.startsWith('84') && digits.length >= 11) {
    digits = digits.slice(2);
  }
  if (digits.startsWith('0')) {
    digits = digits.slice(1);
  }
  return digits;
}

export function isLikelyPhoneQuery(query: string): boolean {
  const trimmed = query.trim();
  if (!trimmed) return false;
  const digits = normalizePhoneDigits(trimmed);
  if (digits.length < 2) return false;
  return digits.length / trimmed.replace(/\s/g, '').length >= 0.6;
}

export function matchesPhoneQuery(query: string, phone?: string | null): boolean {
  const qDigits = normalizePhoneDigits(query.trim());
  if (!qDigits || qDigits.length < 2) return false;
  const pDigits = normalizePhoneDigits(phone ?? '');
  if (!pDigits) return false;

  if (pDigits.includes(qDigits) || qDigits.includes(pDigits)) return true;

  const qKey = phoneMatchKey(query);
  const pKey = phoneMatchKey(phone ?? '');
  if (qKey.length >= 2 && (pKey.includes(qKey) || qKey.includes(pKey))) return true;

  return false;
}

/** Khớp tên khách hoặc SĐT (bỏ khoảng trắng, hỗ trợ gõ thiếu số 0 / +84). */
export function resolveCustomerPhone(
  primary?: string | null,
  fallback?: string | null,
): string | null {
  const phone = primary?.trim() || fallback?.trim();
  return phone || null;
}

export function matchesCustomerNameOrPhone(
  query: string,
  customerName?: string | null,
  customerPhone?: string | null,
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  if (customerName?.toLowerCase().includes(q)) return true;
  if (matchesPhoneQuery(q, customerPhone)) return true;
  return false;
}

export function matchesDocumentNumber(query: string, documentNumber?: string | null): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (documentNumber ?? '').toLowerCase().includes(q);
}

export function matchesAnyDocumentNumber(query: string, documentNumbers: (string | null | undefined)[]): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return documentNumbers.some((value) => (value ?? '').toLowerCase().includes(q));
}

export type SalesListDualSearchValues = {
  customerQuery: string;
  documentQuery: string;
};

export function matchesSalesListDualSearch(
  filters: SalesListDualSearchValues,
  row: {
    customerName?: string | null;
    customerPhone?: string | null;
    documentNumbers: (string | null | undefined)[];
  },
): boolean {
  if (!matchesCustomerNameOrPhone(filters.customerQuery, row.customerName, row.customerPhone)) {
    return false;
  }
  return matchesAnyDocumentNumber(filters.documentQuery, row.documentNumbers);
}

export type SearchSuggestion = { value: string; label: string };

export const EMPTY_SEARCH_SUGGESTIONS: SearchSuggestion[] = [];

export function buildCustomerSearchSuggestions(
  rows: { customerName: string; customerPhone?: string | null }[],
  query: string,
  limit = 15,
): SearchSuggestion[] {
  const q = query.trim();
  if (!q) return EMPTY_SEARCH_SUGGESTIONS;
  const seen = new Set<string>();
  const options: SearchSuggestion[] = [];
  const preferPhone = isLikelyPhoneQuery(q);

  for (const row of rows) {
    if (!matchesCustomerNameOrPhone(q, row.customerName, row.customerPhone)) continue;
    const key = `${row.customerName}:${row.customerPhone ?? ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const value =
      preferPhone && row.customerPhone ? row.customerPhone : row.customerName;
    options.push({
      value,
      label: row.customerPhone ? `${row.customerName} — ${row.customerPhone}` : row.customerName,
    });
    if (options.length >= limit) break;
  }

  return options;
}

export function buildDocumentSearchSuggestions(
  documentNumbers: string[],
  query: string,
  limit = 15,
): SearchSuggestion[] {
  const q = query.trim().toLowerCase();
  if (!q) return EMPTY_SEARCH_SUGGESTIONS;
  const seen = new Set<string>();
  const options: SearchSuggestion[] = [];

  for (const number of documentNumbers) {
    if (!number.toLowerCase().includes(q)) continue;
    if (seen.has(number)) continue;
    seen.add(number);
    options.push({ value: number, label: number });
    if (options.length >= limit) break;
  }

  return options;
}
