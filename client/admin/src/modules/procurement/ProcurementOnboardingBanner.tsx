import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Button, Space, Steps, Typography } from 'antd';
import { Link } from 'react-router-dom';
import {
  ContainerOutlined,
  FileTextOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { fetchGoodsReceipts, fetchPurchaseOrders, fetchSuppliers } from '@/shared/api/procurement.api';

const DISMISS_KEY = 'novixa:procurement-onboarding-dismissed';

type StepStatus = 'wait' | 'process' | 'finish';

export function ProcurementOnboardingBanner() {
  const { t } = useTranslation('procurement', { keyPrefix: 'onboarding' });
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISS_KEY) === '1');
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState({ suppliers: 0, orders: 0, receipts: 0 });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [suppliers, orders, receipts] = await Promise.all([
        fetchSuppliers(),
        fetchPurchaseOrders({ page: 1, pageSize: 1 }),
        fetchGoodsReceipts({ page: 1, pageSize: 1 }),
      ]);
      setCounts({
        suppliers: suppliers.length,
        orders: orders.total,
        receipts: receipts.total,
      });
    } catch {
      /* optional banner */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const allDone = counts.suppliers > 0 && counts.orders > 0 && counts.receipts > 0;

  const steps = useMemo(() => {
    const supplierStatus: StepStatus =
      counts.suppliers > 0 ? 'finish' : counts.orders > 0 || counts.receipts > 0 ? 'process' : 'wait';
    const orderStatus: StepStatus =
      counts.orders > 0 ? 'finish' : counts.suppliers > 0 ? 'process' : 'wait';
    const receiptStatus: StepStatus =
      counts.receipts > 0 ? 'finish' : counts.orders > 0 ? 'process' : 'wait';

    return [
      {
        title: t('steps.suppliers.title'),
        description: t('steps.suppliers.description'),
        status: supplierStatus,
        icon: <TeamOutlined />,
        link: '/procurement/suppliers',
      },
      {
        title: t('steps.orders.title'),
        description: t('steps.orders.description'),
        status: orderStatus,
        icon: <FileTextOutlined />,
        link: '/procurement/purchase-orders',
      },
      {
        title: t('steps.receipts.title'),
        description: t('steps.receipts.description'),
        status: receiptStatus,
        icon: <ContainerOutlined />,
        link: '/procurement/goods-receipts',
      },
    ];
  }, [counts, t]);

  if (dismissed || loading || allDone) return null;

  return (
    <Alert
      type="info"
      showIcon
      style={{ marginBottom: 16 }}
      message={t('title')}
      description={
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Typography.Paragraph style={{ marginBottom: 0 }}>{t('description')}</Typography.Paragraph>
          <Steps
            size="small"
            items={steps.map((step) => ({
              title: step.title,
              description: step.description,
              status: step.status,
              icon: step.icon,
            }))}
          />
          <Space wrap>
            {steps.map((step) => (
              <Link key={step.link} to={step.link}>
                <Button size="small" icon={step.icon}>
                  {step.title}
                </Button>
              </Link>
            ))}
            <Button
              size="small"
              type="link"
              onClick={() => {
                localStorage.setItem(DISMISS_KEY, '1');
                setDismissed(true);
              }}
            >
              {t('dismiss')}
            </Button>
          </Space>
        </Space>
      }
    />
  );
}
