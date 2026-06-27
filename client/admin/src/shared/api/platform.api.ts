import axios from 'axios';
import { apiPath } from '@/shared/api/api-base';
import type {
  CreatePlatformTenantRequest,
  CreatePlatformTenantResponse,
  PlatformPublicConfig,
  PlatformSetupStatus,
  PlatformTenantListItem,
} from '@/shared/api/platform.types';

function platformHeaders(platformKey?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (platformKey?.trim()) {
    headers['X-Platform-Key'] = platformKey.trim();
  }
  return headers;
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
  const { data } = await axios.get<PlatformTenantListItem[]>(apiPath('/api/platform/tenants'), {
    headers: platformHeaders(platformKey),
    timeout: 15_000,
  });
  return data;
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
