export interface PlatformPublicConfig {
  brandName: string;
  productName: string;
  adminUrl: string;
  customerAppUrl: string;
  apiUrl: string;
  loginHint: string;
}

export interface PlatformSetupStatus {
  tenantsCount: number;
  setupRequired: boolean;
  provisioningKeyRequired: boolean;
  brandName: string;
  productName: string;
}

export interface PlatformTenantListItem {
  id: string;
  tenantCode: string;
  tenantName: string;
  createdAt: string;
  status: number;
}

export interface CreatePlatformBranchRequest {
  branchCode: string;
  branchName: string;
  branchAddress?: string;
  branchPhone?: string;
  warehouseCode: string;
  warehouseName: string;
}

export interface CreatePlatformTenantRequest {
  tenantCode: string;
  tenantName: string;
  branchCode: string;
  branchName: string;
  branchAddress?: string;
  branchPhone?: string;
  warehouseCode: string;
  warehouseName: string;
  adminUsername: string;
  adminEmail: string;
  adminFullName: string;
  adminPassword: string;
  loyaltyEnabled: boolean;
  additionalBranches?: CreatePlatformBranchRequest[];
}

export interface CreatePlatformTenantResponse {
  tenantId: string;
  tenantCode: string;
  tenantName: string;
  branchId: string;
  userId: string;
  adminUsername: string;
  branchCount: number;
}
