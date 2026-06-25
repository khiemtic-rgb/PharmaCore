import type { MedicationReminder } from '@/shared/api/customer-app.types';

type ReminderRaw = Record<string, unknown>;

function readString(raw: ReminderRaw, ...keys: string[]): string {
  for (const key of keys) {
    const value = raw[key];
    if (value !== undefined && value !== null && value !== '') {
      return String(value);
    }
  }
  return '';
}

function readBool(raw: ReminderRaw, ...keys: string[]): boolean {
  for (const key of keys) {
    const value = raw[key];
    if (typeof value === 'boolean') return value;
  }
  return false;
}

function readDays(raw: ReminderRaw): number[] {
  const value = raw.daysOfWeek ?? raw.DaysOfWeek;
  if (!Array.isArray(value)) return [];
  return value.map((day) => Number(day));
}

export function normalizeReminderId(id: string): string {
  return id.trim().toLowerCase();
}

export function normalizeReminder(raw: ReminderRaw): MedicationReminder {
  const id = readString(raw, 'id', 'Id');
  if (!id) {
    throw new Error('Thiếu id lịch nhắc từ API');
  }

  const nextRemindAt = raw.nextRemindAt ?? raw.NextRemindAt;

  return {
    id: normalizeReminderId(id),
    productId: readString(raw, 'productId', 'ProductId'),
    productCode: readString(raw, 'productCode', 'ProductCode'),
    productName: readString(raw, 'productName', 'ProductName'),
    dosageNote: (raw.dosageNote ?? raw.DosageNote ?? null) as string | null,
    remindTime: readString(raw, 'remindTime', 'RemindTime'),
    daysOfWeek: readDays(raw),
    nextRemindAt: nextRemindAt ? String(nextRemindAt) : null,
    isActive: readBool(raw, 'isActive', 'IsActive'),
    createdAt: readString(raw, 'createdAt', 'CreatedAt'),
    updatedAt: readString(raw, 'updatedAt', 'UpdatedAt'),
  };
}

export function normalizeReminderList(raw: unknown): MedicationReminder[] {
  const envelope = raw as { items?: unknown[]; Items?: unknown[] };
  const rows = envelope.items ?? envelope.Items ?? [];
  const normalized = rows.map((row) => normalizeReminder(row as ReminderRaw));
  const ids = new Set(normalized.map((item) => item.id));
  if (ids.size !== normalized.length) {
    throw new Error('API trả về id lịch nhắc bị trùng');
  }
  return normalized;
}
