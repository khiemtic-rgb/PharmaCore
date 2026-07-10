import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import vi from '@/shared/i18n/locales/vi-VN.json';
import en from '@/shared/i18n/locales/en-US.json';

void i18n.use(initReactI18next).init({
  resources: {
    'vi-VN': { translation: vi },
    'en-US': { translation: en },
  },
  lng: 'vi-VN',
  fallbackLng: 'vi-VN',
  interpolation: { escapeValue: false },
});

export default i18n;
