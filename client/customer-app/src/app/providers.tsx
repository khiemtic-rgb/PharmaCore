import { App as AntApp, ConfigProvider } from 'antd';
import viVN from 'antd/locale/vi_VN';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';
import { AppRouter } from '@/app/router';
import { AppErrorBoundary } from '@/app/AppErrorBoundary';
import { AuthHydrationGate } from '@/shared/auth/AuthHydrationGate';
import { ApiHealthProvider } from '@/shared/api/ApiHealthProvider';

dayjs.locale('vi');

const theme = {
  token: {
    colorPrimary: '#0f766e',
    borderRadius: 10,
  },
};

export function AppProviders() {
  return (
    <AppErrorBoundary>
      <ConfigProvider locale={viVN} theme={theme}>
        <AntApp>
          <ApiHealthProvider>
            <AuthHydrationGate>
              <AppRouter />
            </AuthHydrationGate>
          </ApiHealthProvider>
        </AntApp>
      </ConfigProvider>
    </AppErrorBoundary>
  );
}
