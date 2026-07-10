import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PartnerLoginResponse, PartnerMe } from '@/shared/api/partner-portal.types';

interface AuthState {
  accessToken: string | null;
  expiresAt: string | null;
  partner: PartnerMe | null;
  setSession: (payload: PartnerLoginResponse) => void;
  setPartner: (partner: PartnerMe) => void;
  clearSession: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      expiresAt: null,
      partner: null,
      setSession: (payload) =>
        set({
          accessToken: payload.accessToken,
          expiresAt: payload.expiresAt,
          partner: payload.partner,
        }),
      setPartner: (partner) => set({ partner }),
      clearSession: () => set({ accessToken: null, expiresAt: null, partner: null }),
      isAuthenticated: () => Boolean(get().accessToken),
    }),
    {
      name: 'kitplatform-partner-auth',
      partialize: (state) => ({
        accessToken: state.accessToken,
        expiresAt: state.expiresAt,
        partner: state.partner,
      }),
    },
  ),
);
