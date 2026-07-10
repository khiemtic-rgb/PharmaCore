import { http } from '@/shared/api/http';
export type { AssessmentSubmissionDetail, AssessmentSubmissionListItem, AssessmentSubmissionListResult } from '@/shared/api/assessment-admin.api';
export { fetchAssessmentSubmissions, fetchAssessmentSubmissionDetail, scoreTo100 } from '@/shared/api/assessment-admin.api';

export interface KapAccess {
  enabled: boolean;
}

export interface KapTemplateListItem {
  id: string;
  code: string;
  name: string;
  version: string;
  status: string;
  description?: string | null;
  updatedAt: string;
}

export interface KapTemplateDetail extends KapTemplateListItem {
  verticals: string[];
  tree: {
    id: string;
    code: string;
    name: string;
    version: string;
    categories: unknown[];
  };
}

export interface KapRule {
  id: string;
  templateId: string;
  code: string;
  name: string;
  expression: string;
  actionType: string;
  actionPayloadJson: string;
  priority: number;
  isActive: boolean;
}

export interface SurveyCampaign {
  id: string;
  templateId: string;
  templateCode: string;
  campaignCode: string;
  campaignName: string;
  status: string;
  settingsJson: string;
  createdAt: string;
  updatedAt: string;
}

export async function fetchKapAccess(): Promise<KapAccess> {
  const { data } = await http.get<KapAccess>('/system/kap/access');
  return data;
}

export async function fetchKapTemplates(): Promise<KapTemplateListItem[]> {
  const { data } = await http.get<KapTemplateListItem[]>('/system/kap/templates');
  return data;
}

export async function fetchKapTemplate(id: string): Promise<KapTemplateDetail> {
  const { data } = await http.get<KapTemplateDetail>(`/system/kap/templates/${id}`);
  return data;
}

export async function updateKapTemplate(
  id: string,
  payload: { name: string; description?: string; status: string },
): Promise<KapTemplateDetail> {
  const { data } = await http.put<KapTemplateDetail>(`/system/kap/templates/${id}`, payload);
  return data;
}

export async function fetchKapRules(templateId: string): Promise<KapRule[]> {
  const { data } = await http.get<KapRule[]>(`/system/kap/templates/${templateId}/rules`);
  return data;
}

export async function createKapRule(payload: {
  templateId: string;
  code: string;
  name: string;
  expression: string;
  actionType: string;
  actionPayloadJson: string;
  priority?: number;
  isActive?: boolean;
}): Promise<KapRule> {
  const { data } = await http.post<KapRule>('/system/kap/rules', payload);
  return data;
}

export async function updateKapRule(
  id: string,
  payload: {
    name: string;
    expression: string;
    actionType: string;
    actionPayloadJson: string;
    priority: number;
    isActive: boolean;
  },
): Promise<KapRule> {
  const { data } = await http.put<KapRule>(`/system/kap/rules/${id}`, payload);
  return data;
}

export async function deleteKapRule(id: string): Promise<void> {
  await http.delete(`/system/kap/rules/${id}`);
}

export type KapPartnerListItem = {
  id: string;
  code: string;
  name: string;
  partnerType: string;
  phone?: string | null;
  email?: string | null;
  status: string;
  commissionRatePct?: number | null;
  createdAt: string;
  lastLoginAt?: string | null;
  submissionCount: number;
  leadCount: number;
};

export type KapPartnerDetail = KapPartnerListItem & {
  notes?: string | null;
  referralUrl: string;
  completedCount: number;
};

export async function fetchKapPartners(): Promise<KapPartnerListItem[]> {
  const { data } = await http.get<KapPartnerListItem[]>('/system/kap/partners');
  return data;
}

export async function createKapPartner(payload: {
  code: string;
  name: string;
  partnerType: string;
  password: string;
  phone?: string;
  email?: string;
  commissionRatePct?: number | null;
  notes?: string;
}): Promise<KapPartnerDetail> {
  const { data } = await http.post<KapPartnerDetail>('/system/kap/partners', payload);
  return data;
}

export async function updateKapPartner(
  id: string,
  payload: {
    name: string;
    partnerType: string;
    phone?: string | null;
    email?: string | null;
    status: string;
    commissionRatePct?: number | null;
    notes?: string | null;
    newPassword?: string;
  },
): Promise<KapPartnerDetail> {
  const { data } = await http.put<KapPartnerDetail>(`/system/kap/partners/${id}`, payload);
  return data;
}

export async function fetchSurveyCampaigns(status?: string): Promise<SurveyCampaign[]> {
  const { data } = await http.get<SurveyCampaign[]>('/survey/campaigns', { params: { status } });
  return data;
}

export async function createSurveyCampaign(payload: {
  templateId: string;
  campaignCode: string;
  campaignName: string;
  status?: string;
  settingsJson?: string;
}): Promise<SurveyCampaign> {
  const { data } = await http.post<SurveyCampaign>('/survey/campaigns', payload);
  return data;
}

export async function updateSurveyCampaign(
  id: string,
  payload: { campaignName: string; status: string; settingsJson?: string },
): Promise<SurveyCampaign> {
  const { data } = await http.put<SurveyCampaign>(`/survey/campaigns/${id}`, payload);
  return data;
}

export async function archiveSurveyCampaign(id: string): Promise<void> {
  await http.delete(`/survey/campaigns/${id}`);
}
