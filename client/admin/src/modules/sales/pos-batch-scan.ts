import type { CartLine } from '@/shared/api/sales.types';
import { batchLabelMatchesHints } from '@/modules/sales/pos-batch-mode-ui';
import { extractBatchFromScan, extractExpiryFromGs1Scan } from '@/modules/sales/pos-gs1-parse';

function resolveBatchNumber(scan: string, line: CartLine): string | null {
  const candidates = [extractBatchFromScan(scan), scan.trim()].filter(
    (value, index, list) => value && list.indexOf(value) === index,
  ) as string[];

  const expiryHint = extractExpiryFromGs1Scan(scan);

  for (const normalized of candidates) {
    if (!batchLabelMatchesHints(normalized, line.batchHints)) continue;
    const matches = (line.batchHints ?? []).filter(
      (h) => h.batchNumber.trim().toLowerCase() === normalized.toLowerCase(),
    );
    if (matches.length === 1) {
      return matches[0]!.batchNumber;
    }
    if (matches.length > 1 && expiryHint) {
      const byExpiry = matches.find((h) => h.expiryDate?.startsWith(expiryHint));
      if (byExpiry) return byExpiry.batchNumber;
    }
    if (matches.length > 0) {
      return matches[0]!.batchNumber;
    }
    return normalized;
  }

  return null;
}

/**
 * Gán số lô từ quét mã vạch nhãn lô (GS1 hoặc số lô thuần) vào dòng giỏ phù hợp.
 * Ưu tiên dòng chưa có lô, khớp batchHints; nếu không có thì dòng khớp cuối cùng.
 */
export function applyBatchLabelScan(
  cart: CartLine[],
  scan: string,
): { cart: CartLine[]; batchNumber: string; productName: string } | null {
  const normalized = scan.trim();
  if (!normalized || cart.length === 0) return null;

  const matches = cart
    .map((line, index) => ({ line, index }))
    .filter(({ line }) => resolveBatchNumber(normalized, line) !== null);

  if (matches.length === 0) return null;

  const pending = matches.filter(({ line }) => !line.batchLabel?.trim());
  const target = (pending.length > 0 ? pending[pending.length - 1] : matches[matches.length - 1]).line;
  const batchNumber = resolveBatchNumber(normalized, target);
  if (!batchNumber) return null;

  return {
    cart: cart.map((line) =>
      line.key === target.key ? { ...line, batchLabel: batchNumber } : line,
    ),
    batchNumber,
    productName: target.productName,
  };
}
