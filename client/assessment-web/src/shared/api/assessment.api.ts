import axios from 'axios';

const api = axios.create({
  baseURL: '/api/public/assessment',
  withCredentials: true,
});

export type AssessmentOption = {
  id: string;
  code: string;
  label: string;
  score: number | null;
  sortOrder: number;
};

export type AssessmentQuestion = {
  id: string;
  code: string;
  title: string;
  helpText?: string | null;
  questionType: string;
  scorable: boolean;
  required: boolean;
  sortOrder: number;
  options: AssessmentOption[];
};

export type AssessmentCategory = {
  code: string;
  name: string;
  sortOrder: number;
  dimensions: { code: string; name: string; questions: AssessmentQuestion[] }[];
};

export type AssessmentTemplate = {
  id: string;
  code: string;
  name: string;
  version: string;
  categories: AssessmentCategory[];
};

export type CreateSubmissionResult = {
  id: string;
  sessionToken: string;
  status: string;
  templateCode: string;
  templateVersion: string;
  expiresAt: string;
};

export type SubmissionDetail = {
  id: string;
  status: string;
  templateCode: string;
  templateVersion: string;
  startedAt: string;
  completedAt?: string | null;
  responses: Record<string, { optionId?: string | null; textValue?: string | null }>;
  overallScore?: number | null;
  overallPct?: number | null;
  categoryScores?: CategoryScore[];
  previewInsights?: { title: string; body: string; severity: string }[];
};

export type CategoryScore = {
  code: string;
  name: string;
  score: number;
  scorePct: number;
};

export type CompleteResult = {
  status: string;
  overallScore: number;
  overallPct: number;
  categoryScores: CategoryScore[];
  previewInsights: { title: string; body: string; severity: string }[];
  reportLocked: boolean;
  leadCaptureRequired: boolean;
};

export type FullReport = {
  submissionId: string;
  templateCode: string;
  completedAt?: string | null;
  overallScore: number;
  overallPct: number;
  categoryScores: CategoryScore[];
  dimensionScores: { code: string; name: string; categoryCode: string; score: number; scorePct: number }[];
  insights: { title: string; body: string; severity: string }[];
  recommendations: {
    title: string;
    body: string;
    priority: number;
    productArea?: string | null;
    estimateHint?: string | null;
  }[];
  qualitativeTags: { painPoint?: string | null; priorityNeed?: string | null };
  pdf: { available: boolean; downloadUrl?: string | null };
};

function sessionHeader(token?: string) {
  const stored = token ?? sessionStorage.getItem('assessment_session') ?? undefined;
  return stored ? { 'X-Assessment-Session': stored } : {};
}

export async function fetchTemplate(code = 'PHARMACY_V1') {
  const { data } = await api.get<AssessmentTemplate>(`/templates/${code}`);
  return data;
}

export async function createSubmission() {
  const { data } = await api.post<CreateSubmissionResult>('/submissions', {
    templateCode: 'PHARMACY_V1',
    templateVersion: '1.0',
    source: 'public_web',
    locale: 'vi-VN',
  });
  sessionStorage.setItem('assessment_session', data.sessionToken);
  return data;
}

export async function getSubmission(id: string) {
  const { data } = await api.get<SubmissionDetail>(`/submissions/${id}`, {
    headers: sessionHeader(),
  });
  return data;
}

export async function saveResponses(id: string, responses: { questionId: string; optionId: string }[]) {
  const { data } = await api.put(`/submissions/${id}/responses`, { responses }, { headers: sessionHeader() });
  return data as { saved: number; answeredRequired: number; totalRequired: number };
}

export async function completeSubmission(id: string) {
  const { data } = await api.post<CompleteResult>(`/submissions/${id}/complete`, {}, { headers: sessionHeader() });
  return data;
}

export async function captureLead(
  id: string,
  payload: {
    respondentName: string;
    respondentPhone: string;
    respondentEmail: string;
    respondentOrgName: string;
    respondentNote?: string;
    consentMarketing: boolean;
  },
) {
  const { data } = await api.post(`/submissions/${id}/capture-lead`, payload, { headers: sessionHeader() });
  return data;
}

export async function fetchReport(id: string) {
  const { data } = await api.get<FullReport>(`/submissions/${id}/report`, { headers: sessionHeader() });
  return data;
}

export function flattenQuestions(template: AssessmentTemplate): AssessmentQuestion[] {
  const items: AssessmentQuestion[] = [];
  for (const cat of template.categories) {
    for (const dim of cat.dimensions) {
      items.push(...dim.questions);
    }
  }
  return items.sort((a, b) => a.sortOrder - b.sortOrder);
}

export function groupQuestionsByCategory(template: AssessmentTemplate) {
  return template.categories.map((cat) => ({
    code: cat.code,
    name: cat.name,
    questions: cat.dimensions.flatMap((d) => d.questions).sort((a, b) => a.sortOrder - b.sortOrder),
  }));
}
