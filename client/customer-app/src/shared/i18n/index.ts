import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enUS from '@/shared/i18n/locales/en-US.json';
import viVN from '@/shared/i18n/locales/vi-VN.json';

export const CUSTOMER_LOCALE_STORAGE_KEY = 'pharmacore-customer-locale';
export const CUSTOMER_LOCALES = ['vi-VN', 'en-US'] as const;
export type CustomerLocale = (typeof CUSTOMER_LOCALES)[number];

export function isCustomerLocale(value: string | null | undefined): value is CustomerLocale {
  return value === 'vi-VN' || value === 'en-US';
}

export function readStoredLocale(): string | null {
  try {
    const stored = localStorage.getItem(CUSTOMER_LOCALE_STORAGE_KEY)?.trim();
    return stored || null;
  } catch {
    return null;
  }
}

export function writeStoredLocale(locale: string) {
  const code = locale.trim();
  if (!code) return;
  try {
    localStorage.setItem(CUSTOMER_LOCALE_STORAGE_KEY, code);
  } catch {
    // ignore quota / private mode
  }
}

void i18n.use(initReactI18next).init({
  resources: {
    'vi-VN': { translation: viVN },
    'en-US': { translation: enUS },
  },
  lng: readStoredLocale() ?? 'vi-VN',
  fallbackLng: 'vi-VN',
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
});

export default i18n;
