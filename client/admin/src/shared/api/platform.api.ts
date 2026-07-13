import axios from 'axios';
import { apiPath } from '@/shared/api/api-base';
import type {
  CreatePlatformTenantRequest,
  CreatePlatformTenantResponse,
  PlatformModuleRegistryItem,
  PlatformPublicConfig,
  PlatformSetupStatus,
  PlatformTenantEntitlement,
  PlatformTenantListItem,
  UpdatePlatformTenantEntitlementRequest,
} from '@/shared/api/platform.types';

function platformHeaders(platformKey?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (platformKey?.trim()) {
    headers['X-Platform-Key'] = platformKey.trim();
  }
  return headers;
}

function normalizeTenantListItem(raw: Record<string, unknown>): PlatformTenantListItem {
  return {
    id: String(raw.id ?? raw.Id),
    tenantCode: String(raw.tenantCode ?? raw.TenantCode),
    tenantName: String(raw.tenantName ?? raw.TenantName),
    createdAt: String(raw.createdAt ?? raw.CreatedAt),
    status: Number(raw.status ?? raw.Status ?? 1),
    vertical: String(raw.vertical ?? raw.Vertical ?? 'pharmacy'),
    allowedModuleCount: Number(raw.allowedModuleCount ?? raw.AllowedModuleCount ?? 0),
    enabledModuleCount: Number(raw.enabledModuleCount ?? raw.EnabledModuleCount ?? 0),
  };
}

function normalizeModule(raw: Record<string, unknown>): PlatformModuleRegistryItem {
  const verticalsRaw = raw.verticals ?? raw.Verticals;
  return {
    moduleCode: String(raw.moduleCode ?? raw.ModuleCode),
    moduleName: String(raw.moduleName ?? raw.ModuleName),
    description: (raw.description ?? raw.Description) as string | null | undefined,
    verticals: Array.isArray(verticalsRaw) ? verticalsRaw.map(String) : [],
    sortOrder: Number(raw.sortOrder ?? raw.SortOrder ?? 0),
  };
}

function normalizeEntitlement(raw: Record<string, unknown>): PlatformTenantEntitlement {
  const allowed = raw.allowedModules ?? raw.AllowedModules;
  const enabled = raw.enabledModules ?? raw.EnabledModules;
  const maxRaw = raw.maxBranches ?? raw.MaxBranches;
  const maxBranches =
    maxRaw == null || maxRaw === ''
      ? null
      : Number.isFinite(Number(maxRaw)) && Number(maxRaw) >= 1
        ? Math.floor(Number(maxRaw))
        : null;
  return {
    tenantId: String(raw.tenantId ?? raw.TenantId),
    tenantCode: String(raw.tenantCode ?? raw.TenantCode),
    tenantName: String(raw.tenantName ?? raw.TenantName),
    vertical: String(raw.vertical ?? raw.Vertical ?? 'pharmacy'),
    allowedModules: Array.isArray(allowed) ? allowed.map(String) : [],
    enabledModules: Array.isArray(enabled) ? enabled.map(String) : [],
    maxBranches,
  };
}

export async function fetchPlatformPublicConfig(): Promise<PlatformPublicConfig> {
  const { data } = await axios.get<PlatformPublicConfig>(apiPath('/api/platform/public-config'), {
    timeout: 15_000,
  });
  return data;
}

export async function fetchPlatformSetupStatus(): Promise<PlatformSetupStatus> {
  const { data } = await axios.get<PlatformSetupStatus>(apiPath('/api/platform/setup-status'), {
    timeout: 15_000,
  });
  return data;
}

export async function fetchPlatformTenants(platformKey?: string): Promise<PlatformTenantListItem[]> {
  const { data } = await axios.get<Record<string, unknown>[]>(apiPath('/api/platform/tenants'), {
    headers: platformHeaders(platformKey),
    timeout: 15_000,
  });
  return (data ?? []).map(normalizeTenantListItem);
}

export async function fetchPlatformModules(platformKey?: string): Promise<PlatformModuleRegistryItem[]> {
  const { data } = await axios.get<Record<string, unknown>[]>(apiPath('/api/platform/modules'), {
    headers: platformHeaders(platformKey),
    timeout: 15_000,
  });
  return (data ?? []).map(normalizeModule);
}

export async function fetchPlatformTenantEntitlement(
  tenantId: string,
  platformKey?: string,
): Promise<PlatformTenantEntitlement> {
  const { data } = await axios.get<Record<string, unknown>>(
    apiPath(`/api/platform/tenants/${tenantId}/entitlement`),
    { headers: platformHeaders(platformKey), timeout: 15_000 },
  );
  return normalizeEntitlement(data);
}

export async function updatePlatformTenantEntitlement(
  tenantId: string,
  body: UpdatePlatformTenantEntitlementRequest,
  platformKey?: string,
): Promise<PlatformTenantEntitlement> {
  const { data } = await axios.put<Record<string, unknown>>(
    apiPath(`/api/platform/tenants/${tenantId}/entitlement`),
    body,
    { headers: platformHeaders(platformKey), timeout: 30_000 },
  );
  return normalizeEntitlement(data);
}

export async function createPlatformTenant(
  body: CreatePlatformTenantRequest,
  platformKey?: string,
): Promise<CreatePlatformTenantResponse> {
  const { data } = await axios.post<Record<string, unknown>>(
    apiPath('/api/platform/tenants'),
    body,
    { headers: platformHeaders(platformKey), timeout: 30_000 },
  );
  return {
    tenantId: String(data.tenantId ?? data.TenantId),
    tenantCode: String(data.tenantCode ?? data.TenantCode),
    tenantName: String(data.tenantName ?? data.TenantName),
    branchId: String(data.branchId ?? data.BranchId),
    userId: String(data.userId ?? data.UserId),
    adminUsername: String(data.adminUsername ?? data.AdminUsername),
    branchCount: Number(data.branchCount ?? data.BranchCount ?? 1),
  };
}
