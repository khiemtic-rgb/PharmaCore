import vi from './vi.json';

export type Locale = 'vi';

export const defaultLocale: Locale = 'vi';
export const locales: Locale[] = ['vi'];

export function t(locale: Locale = 'vi') {
  if (locale === 'vi') return vi;
  return vi;
}

export type Messages = typeof vi;
