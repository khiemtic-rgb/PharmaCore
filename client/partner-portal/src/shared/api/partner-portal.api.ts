import { partnerHttp } from '@/shared/api/http';
import { apiPath } from '@/shared/api/api-base';
import axios from 'axios';
import type { PartnerDashboard, PartnerLead, PartnerLoginResponse, PartnerMe } from '@/shared/api/partner-portal.types';

export async function loginPartner(login: string, password: string) {
  const { data } = await axios.post<PartnerLoginResponse>(apiPath('/api/partner-portal/auth/login'), {
    login,
    password,
  });
  return data;
}

export async function fetchMe() {
  const { data } = await partnerHttp.get<PartnerMe>('/auth/me');
  return data;
}

export async function fetchDashboard() {
  const { data } = await partnerHttp.get<PartnerDashboard>('/dashboard');
  return data;
}

export async function fetchLeads() {
  const { data } = await partnerHttp.get<PartnerLead[]>('/leads');
  return data;
}
