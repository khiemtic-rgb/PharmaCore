import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Card, Space, Spin, Typography } from 'antd';
import { MobileOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { fetchCustomerPilotOtp } from '@/shared/api/customer-admin.api';
import type { CustomerPilotOtpStatus } from '@/shared/api/customer-admin.types';

const POLL_MS = 4000;

type Props = {
  customerId: string;
};

export function CustomerPilotOtpPanel({ customerId }: Props) {
  const { t } = useTranslation('customer', { keyPrefix: 'pilotOtp' });
  const [status, setStatus] = useState<CustomerPilotOtpStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const next = await fetchCustomerPilotOtp(customerId);
      setStatus(next);
    } catch {
      setStatus({ enabled: false, code: null, expiresAt: null, createdAt: null });
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), POLL_MS);
    return () => window.clearInterval(timer);
  }, [load]);

  if (loading) {
    return (
      <Card size="small">
        <Spin size="small" />
      </Card>
    );
  }

  if (!status?.enabled) {
    return null;
  }

  const expiresLabel =
    status.expiresAt != null ? dayjs(status.expiresAt).format('HH:mm:ss') : null;

  return (
    <Card size="small" title={t('title')} extra={<MobileOutlined />}>
      {status.code ? (
        <Space direction="vertical" size="small" style={{ width: '100%' }}>
          <Alert
            type="success"
            showIcon
            message={t('activeMessage')}
            description={
              <Space direction="vertical" size={4}>
                <Typography.Title
                  level={2}
                  style={{ margin: 0, letterSpacing: 8, fontFamily: 'monospace' }}
                >
                  {status.code}
                </Typography.Title>
                {expiresLabel ? (
                  <Typography.Text type="secondary">
                    {t('expiresAt', { time: expiresLabel })}
                  </Typography.Text>
                ) : null}
              </Space>
            }
          />
          <Typography.Text type="secondary">{t('hint')}</Typography.Text>
        </Space>
      ) : (
        <Alert type="info" showIcon message={t('waiting')} description={t('waitingHint')} />
      )}
    </Card>
  );
}
