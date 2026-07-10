import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PrescriberLoginResponse, PrescriberProfile } from '@/shared/api/prescriber-portal.types';

interface AuthState {
  accessToken: string | null;
  expiresAt: string | null;
  profile: PrescriberProfile | null;
  setSession: (payload: PrescriberLoginResponse) => void;
  setProfile: (profile: PrescriberProfile) => void;
  clearSession: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      expiresAt: null,
      profile: null,
      setSession: (payload) =>
        set({
          accessToken: payload.accessToken,
          expiresAt: payload.expiresAt,
          profile: payload.profile,
        }),
      setProfile: (profile) => set({ profile }),
      clearSession: () =>
        set({
          accessToken: null,
          expiresAt: null,
          profile: null,
        }),
      isAuthenticated: () => Boolean(get().accessToken),
    }),
    {
      name: 'kitplatform-prescriber-auth',
      partialize: (state) => ({
        accessToken: state.accessToken,
        expiresAt: state.expiresAt,
        profile: state.profile,
      }),
    },
  ),
);
