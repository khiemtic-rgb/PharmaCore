import { App as AntApp, ConfigProvider } from 'antd';
import viVN from 'antd/locale/vi_VN';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';
import { AppRouter } from '@/app/router';
import { AuthHydrationGate } from '@/shared/auth/AuthHydrationGate';

dayjs.locale('vi');

const theme = {
  token: {
    colorPrimary: '#0f766e',
    borderRadius: 10,
  },
};

export function AppProviders() {
  return (
    <ConfigProvider locale={viVN} theme={theme}>
      <AntApp>
        <AuthHydrationGate>
          <AppRouter />
        </AuthHydrationGate>
      </AntApp>
    </ConfigProvider>
  );
}
