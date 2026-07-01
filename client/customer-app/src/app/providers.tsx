import { App as AntApp } from 'antd';
import { AppRouter } from '@/app/router';
import { AppErrorBoundary } from '@/app/AppErrorBoundary';
import { AuthHydrationGate } from '@/shared/auth/AuthHydrationGate';
import { ApiHealthProvider } from '@/shared/api/ApiHealthProvider';
import { BrandingProvider } from '@/shared/config/BrandingProvider';
import { LocaleProvider } from '@/shared/i18n/LocaleProvider';
import '@/shared/i18n';

export function AppProviders() {
  return (
    <AppErrorBoundary>
      <AntApp>
        <ApiHealthProvider>
          <BrandingProvider>
            <LocaleProvider>
              <AuthHydrationGate>
                <AppRouter />
              </AuthHydrationGate>
            </LocaleProvider>
          </BrandingProvider>
        </ApiHealthProvider>
      </AntApp>
    </AppErrorBoundary>
  );
}
