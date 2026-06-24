const GS1_FNC1 = '\u001d';

/**
 * Tách số lô từ chuỗi quét GS1-128 hoặc trả về nguyên bản nếu không phải GS1.
 * Hỗ trợ AI (10) batch/lot và chuỗi dạng (01)...(17)...(10)...
 */
export function extractBatchFromScan(raw: string): string {
  const input = raw.trim();
  if (!input) return input;

  const fromParen = input.match(/\(10\)([^(\x1D]+)/);
  if (fromParen?.[1]) {
    return fromParen[1].trim();
  }

  const compact = input.replace(/\s/g, '');
  const gtinExpiryBatch = compact.match(/^01(\d{14})17(\d{6})10(.+)$/);
  if (gtinExpiryBatch?.[3]) {
    return gtinExpiryBatch[3].split(GS1_FNC1)[0]?.trim() ?? gtinExpiryBatch[3].trim();
  }

  const afterFnc1 = compact.split(GS1_FNC1);
  for (const segment of afterFnc1) {
    if (segment.startsWith('10') && segment.length > 2) {
      return segment.slice(2).trim();
    }
  }

  const inline10 = compact.match(/(?:^|\x1D)10([^(\x1D]{1,20})/);
  if (inline10?.[1]) {
    return inline10[1].trim();
  }

  return input;
}

/** YYMMDD từ AI (17) — dùng đối chiếu phụ khi có nhiều lô trùng số. */
export function extractExpiryFromGs1Scan(raw: string): string | undefined {
  const input = raw.trim().replace(/\s/g, '');
  const fromParen = input.match(/\(17\)(\d{6})/);
  if (fromParen?.[1]) {
    return formatGs1Expiry(fromParen[1]);
  }
  const compact = input.match(/^01\d{14}17(\d{6})/);
  if (compact?.[1]) {
    return formatGs1Expiry(compact[1]);
  }
  return undefined;
}

function formatGs1Expiry(yymmdd: string): string | undefined {
  if (!/^\d{6}$/.test(yymmdd)) return undefined;
  const yy = Number(yymmdd.slice(0, 2));
  const mm = yymmdd.slice(2, 4);
  const dd = yymmdd.slice(4, 6);
  const year = yy >= 70 ? 1900 + yy : 2000 + yy;
  return `${year}-${mm}-${dd}`;
}
