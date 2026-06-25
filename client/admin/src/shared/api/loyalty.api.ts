import { http } from '@/shared/api/http';
import {
  normalizeLoyaltySettings,
  type LoyaltyAdminSettings,
  type UpdateLoyaltyAdminSettings,
} from '@/shared/api/loyalty.types';

export async function fetchLoyaltySettings(): Promise<LoyaltyAdminSettings> {
  const { data } = await http.get<Record<string, unknown>>('/loyalty/settings');
  return normalizeLoyaltySettings(data);
}

export async function saveLoyaltySettings(
  payload: UpdateLoyaltyAdminSettings,
): Promise<LoyaltyAdminSettings> {
  const { data } = await http.put<Record<string, unknown>>('/loyalty/settings', payload);
  return normalizeLoyaltySettings(data);
}
