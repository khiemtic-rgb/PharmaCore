import { http } from '@/shared/api/http';

export interface AssessmentAdminAccess {
  enabled: boolean;
}

export interface AssessmentSubmissionListItem {
  id: string;
  status: string;
  templateCode: string;
  templateVersion: string;
  startedAt: string;
  completedAt?: string | null;
  leadCapturedAt?: string | null;
  overallScore?: number | null;
  overallPct?: number | null;
  responseCount: number;
  respondentName?: string | null;
  respondentPhone?: string | null;
  respondentEmail?: string | null;
  respondentOrgName?: string | null;
}

export interface AssessmentSubmissionListResult {
  items: AssessmentSubmissionListItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AssessmentSubmissionDetail extends AssessmentSubmissionListItem {
  respondentNote?: string | null;
  consentMarketing: boolean;
  categoryScores: { code: string; name: string; score: number; scorePct: number }[];
  insights: { title: string; body: string; severity: string }[];
  recommendations: {
    title: string;
    body: string;
    priority: number;
    productArea?: string | null;
    estimateHint?: string | null;
  }[];
  qualitativeTags: { painPoint?: string | null; priorityNeed?: string | null };
  responseCount: number;
  requiredCount: number;
}

export async function fetchAssessmentAdminAccess(): Promise<AssessmentAdminAccess> {
  const { data } = await http.get<AssessmentAdminAccess>('/system/assessment/access');
  return data;
}

export async function fetchAssessmentSubmissions(params: {
  page?: number;
  pageSize?: number;
  status?: string;
  hasLead?: boolean;
}): Promise<AssessmentSubmissionListResult> {
  const { data } = await http.get<AssessmentSubmissionListResult>('/system/assessment/submissions', {
    params,
  });
  return data;
}

export async function fetchAssessmentSubmissionDetail(id: string): Promise<AssessmentSubmissionDetail> {
  const { data } = await http.get<AssessmentSubmissionDetail>(`/system/assessment/submissions/${id}`);
  return data;
}

export function scoreTo100(scorePct?: number | null): number | null {
  if (scorePct == null) return null;
  return Math.round(Math.max(0, Math.min(100, scorePct)));
}
