import { ConfigProvider } from 'antd';
import viVN from 'antd/locale/vi_VN';
import enUS from 'antd/locale/en_US';
import { useTranslation } from 'react-i18next';
import type { ReactNode } from 'react';

export function LocaleProvider({ children }: { children: ReactNode }) {
  const { i18n } = useTranslation();
  const locale = i18n.language.startsWith('en') ? enUS : viVN;

  return (
    <ConfigProvider
      locale={locale}
      theme={{
        token: {
          colorPrimary: '#1d4ed8',
          borderRadius: 10,
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
        },
      }}
    >
      {children}
    </ConfigProvider>
  );
}
