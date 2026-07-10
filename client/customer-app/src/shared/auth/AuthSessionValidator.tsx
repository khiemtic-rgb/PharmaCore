import { useEffect, useState, type ReactNode } from 'react';
import axios from 'axios';
import { Spin } from 'antd';
import { useTranslation } from 'react-i18next';
import { fetchProfile } from '@/shared/api/customer-app.api';
import { useAuthStore } from '@/shared/auth/auth.store';
import { forceCustomerLogout } from '@/shared/auth/force-logout';

function ValidatingFallback() {
  const { t } = useTranslation();
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Spin size="large" tip={t('auth.booting')}>
        <div style={{ minHeight: 120, minWidth: 120 }} />
      </Spin>
    </div>
  );
}

/** Xác thực token sau khi hydrate — tránh UI kẹt với phiên hết hạn trong localStorage. */
export function AuthSessionValidator({ children }: { children: ReactNode }) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const setProfile = useAuthStore((s) => s.setProfile);
  const [ready, setReady] = useState(() => !accessToken);

  useEffect(() => {
    if (!accessToken) {
      setReady(true);
      return;
    }

    let cancelled = false;
    setReady(false);

    void fetchProfile()
      .then((profile) => {
        if (!cancelled) setProfile(profile);
      })
      .catch((error) => {
        if (cancelled) return;
        if (axios.isAxiosError(error) && error.response?.status === 401) {
          forceCustomerLogout();
          return;
        }
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken, setProfile]);

  if (!ready) return <ValidatingFallback />;
  return children;
}
