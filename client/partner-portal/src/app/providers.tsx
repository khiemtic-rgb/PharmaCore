import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider } from 'antd';
import viVN from 'antd/locale/vi_VN';
import { AppRouter } from '@/app/router';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

export function AppProviders() {
  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider
        locale={viVN}
        theme={{ token: { colorPrimary: '#0f766e', borderRadius: 8 } }}
      >
        <AppRouter />
      </ConfigProvider>
    </QueryClientProvider>
  );
}
