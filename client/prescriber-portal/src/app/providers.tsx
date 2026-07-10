import { QueryClientProvider } from '@tanstack/react-query';
import { App as AntApp } from 'antd';
import { AppRouter } from '@/app/router';
import { AppErrorBoundary } from '@/app/AppErrorBoundary';
import { AuthHydrationGate } from '@/shared/auth/AuthHydrationGate';
import { queryClient } from '@/shared/api/query-client';
import { LocaleProvider } from '@/shared/i18n/LocaleProvider';
import '@/shared/i18n';

export function AppProviders() {
  return (
    <AppErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AntApp>
          <LocaleProvider>
            <AuthHydrationGate>
              <AppRouter />
            </AuthHydrationGate>
          </LocaleProvider>
        </AntApp>
      </QueryClientProvider>
    </AppErrorBoundary>
  );
}
