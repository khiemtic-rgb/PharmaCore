export type PartnerMe = {
  id: string;
  code: string;
  name: string;
  partnerType: string;
  phone?: string | null;
  email?: string | null;
  referralUrl: string;
  qrUrl: string;
};

export type PartnerLoginResponse = {
  accessToken: string;
  expiresAt: string;
  partner: PartnerMe;
};

export type PartnerLead = {
  id: string;
  status: string;
  orgName?: string | null;
  contactName?: string | null;
  phone?: string | null;
  overallPct?: number | null;
  leadPipelineStatus: string;
  commissionStatus: string;
  startedAt: string;
  leadCapturedAt?: string | null;
};

export type PartnerDashboard = {
  submissionCount: number;
  completedCount: number;
  leadCount: number;
  demoScheduledCount: number;
  wonCount: number;
  pendingCommissionCount: number;
  recentLeads: PartnerLead[];
};
