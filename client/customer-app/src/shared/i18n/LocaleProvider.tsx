import enUS from 'antd/locale/en_US';
import viVN from 'antd/locale/vi_VN';
import dayjs from 'dayjs';
import 'dayjs/locale/en';
import 'dayjs/locale/vi';
import { App, ConfigProvider } from 'antd';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useTranslation } from 'react-i18next';
import { updatePreferredLocale, getApiErrorMessage } from '@/shared/api/customer-app.api';
import { useAuthStore } from '@/shared/auth/auth.store';
import {
  CUSTOMER_LOCALES,
  readStoredLocale,
  writeStoredLocale,
} from '@/shared/i18n';
import { useCustomerBranding } from '@/shared/config/BrandingProvider';

type LocaleContextValue = {
  locale: string;
  supportedLocales: string[];
  setLocale: (locale: string) => Promise<boolean>;
  saving: boolean;
};

const LocaleContext = createContext<LocaleContextValue>({
  locale: 'vi-VN',
  supportedLocales: ['vi-VN'],
  setLocale: async () => false,
  saving: false,
});

function resolveInitialLocale(
  profileLocale: string | null | undefined,
  brandingDefault: string | undefined,
  supported: string[],
): string {
  const candidates = [readStoredLocale(), profileLocale, brandingDefault, 'vi-VN'];
  for (const candidate of candidates) {
    if (candidate && supported.includes(candidate)) {
      return candidate;
    }
  }
  return supported[0] ?? 'vi-VN';
}

function antdLocaleFor(locale: string) {
  if (locale === 'en-US' || locale.startsWith('en')) return enUS;
  return viVN;
}

function dayjsLocaleFor(locale: string) {
  if (locale === 'en-US' || locale.startsWith('en')) return 'en';
  return 'vi';
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const { i18n, t } = useTranslation();
  const { message } = App.useApp();
  const { branding } = useCustomerBranding();
  const profile = useAuthStore((s) => s.profile);
  const accessToken = useAuthStore((s) => s.accessToken);
  const setProfile = useAuthStore((s) => s.setProfile);
  const userPickedLocaleRef = useRef(false);

  const supportedLocales = useMemo(() => {
    const fromBranding = (branding.supportedLocales ?? []).map((x) => x.trim()).filter(Boolean);
    const merged = new Set<string>([...CUSTOMER_LOCALES, ...fromBranding]);
    return Array.from(merged);
  }, [branding.supportedLocales]);

  const [locale, setLocaleState] = useState<string>(() =>
    resolveInitialLocale(profile?.preferredLocale, branding.defaultLocale, supportedLocales),
  );
  const [saving, setSaving] = useState(false);

  const applyLocale = useCallback(
    async (next: string) => {
      await i18n.changeLanguage(next);
      dayjs.locale(dayjsLocaleFor(next));
      writeStoredLocale(next);
      document.documentElement.lang = next.startsWith('en') ? 'en' : 'vi';
    },
    [i18n],
  );

  useEffect(() => {
    if (userPickedLocaleRef.current) return;
    const next = resolveInitialLocale(profile?.preferredLocale, branding.defaultLocale, supportedLocales);
    setLocaleState((current) => (current === next ? current : next));
  }, [profile?.preferredLocale, branding.defaultLocale, supportedLocales]);

  useEffect(() => {
    void applyLocale(locale);
  }, [locale, applyLocale]);

  const setLocale = useCallback(
    async (nextLocale: string): Promise<boolean> => {
      if (!supportedLocales.includes(nextLocale) || nextLocale === locale) {
        return true;
      }

      userPickedLocaleRef.current = true;
      setLocaleState(nextLocale);

      if (!accessToken) return true;

      setSaving(true);
      try {
        const updated = await updatePreferredLocale(nextLocale);
        setProfile({ ...updated, preferredLocale: updated.preferredLocale ?? nextLocale });
        return true;
      } catch (error) {
        const status = (error as { response?: { status?: number } })?.response?.status;
        const detail = getApiErrorMessage(error, '');
        if (status === 404) {
          message.warning(t('profile.languageSaveApiMissing'));
        } else if (detail) {
          message.warning(detail);
        } else {
          message.warning(t('profile.languageSaveFailed'));
        }
        return false;
      } finally {
        setSaving(false);
      }
    },
    [accessToken, locale, message, setProfile, supportedLocales, t],
  );

  const value = useMemo(
    () => ({ locale, supportedLocales, setLocale, saving }),
    [locale, supportedLocales, setLocale, saving],
  );

  return (
    <LocaleContext.Provider value={value}>
      <ConfigProvider locale={antdLocaleFor(locale)}>{children}</ConfigProvider>
    </LocaleContext.Provider>
  );
}

export function useCustomerLocale() {
  return useContext(LocaleContext);
}
