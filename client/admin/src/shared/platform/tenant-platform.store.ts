import { create } from 'zustand';
import type { TenantPlatformSettings } from '@/shared/platform/tenant-platform.types';

interface TenantPlatformState {
  settings: TenantPlatformSettings | null;
  loaded: boolean;
  setSettings: (settings: TenantPlatformSettings | null) => void;
  setLoaded: (loaded: boolean) => void;
  clear: () => void;
  isModuleEnabled: (moduleCode: string) => boolean;
  isFeatureEnabled: (featureCode: string) => boolean;
}

export const useTenantPlatformStore = create<TenantPlatformState>((set, get) => ({
  settings: null,
  loaded: false,
  setSettings: (settings) => set({ settings }),
  setLoaded: (loaded) => set({ loaded }),
  clear: () => set({ settings: null, loaded: false }),
  isModuleEnabled: (moduleCode) => {
    const { settings, loaded } = get();
    if (!loaded || !settings) return true;
    return settings.enabledModules.some((m) => m.toLowerCase() === moduleCode.toLowerCase());
  },
  isFeatureEnabled: (featureCode) => {
    const { settings, loaded } = get();
    if (!loaded || !settings) return true;
    return settings.features[featureCode] === true;
  },
}));
