import { http } from '@/shared/api/http';
import {
  normalizeTenantPlatformSettings,
  type TenantPlatformSettings,
} from '@/shared/platform/tenant-platform.types';

export interface PlatformModuleRegistryItem {
  moduleCode: string;
  moduleName: string;
  description?: string | null;
  verticals: string[];
  sortOrder: number;
}

export interface UpdateTenantPlatformSettingsPayload {
  vertical: string;
  enabledModules: string[];
  features?: Record<string, boolean>;
}

function normalizeModule(row: Record<string, unknown>): PlatformModuleRegistryItem {
  const verticalsRaw = row.verticals ?? row.Verticals;
  const verticals = Array.isArray(verticalsRaw) ? verticalsRaw.map((entry) => String(entry)) : [];

  return {
    moduleCode: String(row.moduleCode ?? row.ModuleCode ?? ''),
    moduleName: String(row.moduleName ?? row.ModuleName ?? ''),
    description: (row.description ?? row.Description) as string | null | undefined,
    verticals,
    sortOrder: Number(row.sortOrder ?? row.SortOrder ?? 0),
  };
}

export async function fetchTenantPlatformSettings(): Promise<TenantPlatformSettings> {
  const { data } = await http.get<Record<string, unknown>>('/system/tenant-platform');
  return normalizeTenantPlatformSettings(data);
}

export async function fetchPlatformModuleRegistry(): Promise<PlatformModuleRegistryItem[]> {
  const { data } = await http.get<Array<Record<string, unknown>>>('/system/tenant-platform/modules');
  return data.map(normalizeModule);
}

export async function updateTenantPlatformSettings(
  payload: UpdateTenantPlatformSettingsPayload,
): Promise<{ settings: TenantPlatformSettings; ignoredModuleCodes: string[] }> {
  const { data } = await http.put<Record<string, unknown>>('/system/tenant-platform', payload);
  const settingsRaw = (data.settings ?? data.Settings) as Record<string, unknown> | undefined;
  if (!settingsRaw) {
    throw new Error('Invalid platform settings response');
  }
  const ignoredRaw = data.ignoredModuleCodes ?? data.IgnoredModuleCodes;
  return {
    settings: normalizeTenantPlatformSettings(settingsRaw),
    ignoredModuleCodes: Array.isArray(ignoredRaw) ? ignoredRaw.map(String) : [],
  };
}
