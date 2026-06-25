export interface CustomerProfile {
  accountId: string;
  customerId: string;
  tenantId: string;
  tenantCode: string;
  fullName: string;
  phone: string;
}

export interface CustomerLoginResponse {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: string;
  profile: CustomerProfile;
}

export interface LoyaltyTier {
  tierCode: string;
  tierName: string;
  minPoints: number;
  discountPercent: number;
}

export interface LoyaltyProgramSummary {
  programId: string;
  programCode: string;
  programName: string;
  pointsBalance: number;
  lifetimePoints: number;
  currentTier: LoyaltyTier | null;
  nextTier: LoyaltyTier | null;
}

export interface LoyaltySummary {
  programs: LoyaltyProgramSummary[];
}

export interface LoyaltyTransaction {
  id: string;
  programId: string;
  programCode: string;
  transactionType: number;
  points: number;
  salesOrderId: string | null;
  notes: string | null;
  createdAt: string;
}

export interface PagedLoyaltyTransactions {
  items: LoyaltyTransaction[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CustomerVoucher {
  customerVoucherId: string;
  voucherId: string;
  voucherCode: string;
  voucherName: string;
  discountType: number;
  discountValue: number;
  minOrderAmount: number;
  validFrom: string;
  validTo: string;
  issuedAt: string;
  usedAt: string | null;
  isUsed: boolean;
  isExpired: boolean;
}

export interface CustomerVoucherList {
  items: CustomerVoucher[];
}

export interface MedicationReminder {
  id: string;
  productId: string;
  productCode: string;
  productName: string;
  dosageNote: string | null;
  remindTime: string;
  daysOfWeek: number[];
  nextRemindAt: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MedicationReminderList {
  items: MedicationReminder[];
}

export interface CreateMedicationReminderRequest {
  productId: string;
  dosageNote?: string;
  remindTime: string;
  daysOfWeek?: number[];
}

export interface UpdateMedicationReminderRequest {
  productId?: string;
  dosageNote?: string;
  remindTime?: string;
  daysOfWeek?: number[];
  isActive?: boolean;
}

export const LOYALTY_TX_LABELS: Record<number, string> = {
  1: 'Tích điểm',
  2: 'Đổi điểm',
  3: 'Hết hạn',
  4: 'Điều chỉnh',
};

export const DAY_LABELS: Record<number, string> = {
  1: 'T2',
  2: 'T3',
  3: 'T4',
  4: 'T5',
  5: 'T6',
  6: 'T7',
  7: 'CN',
};

/** Sản phẩm demo — đến khi có API tra cứu cho khách. */
export const DEMO_REMINDER_PRODUCTS = [
  {
    id: '66666666-6666-6666-6666-666666666604',
    label: 'Vitamin C 1000mg (VITC1000)',
  },
] as const;

export const DEFAULT_TENANT_CODE = 'DEMO_PHARMACY';
