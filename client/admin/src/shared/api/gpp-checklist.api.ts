import { http } from '@/shared/api/http';

export type GppChecklistSettings = {
  checked: Record<string, boolean>;
};

function normalizeChecked(data: Record<string, unknown>): Record<string, boolean> {
  const raw = (data.checked ?? data.Checked ?? {}) as Record<string, unknown>;
  return Object.fromEntries(
    Object.entries(raw).map(([key, value]) => [key, Boolean(value)]),
  );
}

export async function fetchGppChecklist(): Promise<GppChecklistSettings> {
  const { data } = await http.get<Record<string, unknown>>('/inventory/gpp-checklist');
  return { checked: normalizeChecked(data) };
}

export async function updateGppChecklist(checked: Record<string, boolean>): Promise<GppChecklistSettings> {
  const { data } = await http.put<Record<string, unknown>>('/inventory/gpp-checklist', { checked });
  return { checked: normalizeChecked(data) };
}
