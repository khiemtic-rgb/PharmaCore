import i18n from '@/shared/i18n';

export function formatMoney(value: number): string {
  const locale = i18n.language === 'en-US' ? 'en-US' : 'vi-VN';
  if (locale === 'en-US') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(value);
  }
  return value.toLocaleString('vi-VN') + 'đ';
}
