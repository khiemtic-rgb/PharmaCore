import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Tabs } from 'antd';
import { CalendarOutlined, FormOutlined } from '@ant-design/icons';
import { isProductFeatureEnabled } from '@/shared/product/product-phases';

export function AppOrdersLayout() {
  const { t } = useTranslation('sales', { keyPrefix: 'salesLayout.appOrders' });
  const location = useLocation();
  const navigate = useNavigate();
  const showReservations = isProductFeatureEnabled('sales.customerReservations');

  const items = useMemo(() => {
    const tabs = [
      {
        key: 'drafts',
        path: '/sales/app-orders/drafts',
        label: (
          <span>
            <FormOutlined /> {t('drafts')}
          </span>
        ),
      },
    ];
    if (showReservations) {
      tabs.push({
        key: 'reservations',
        path: '/sales/app-orders/reservations',
        label: (
          <span>
            <CalendarOutlined /> {t('reservations')}
          </span>
        ),
      });
    }
    return tabs;
  }, [showReservations, t]);

  useEffect(() => {
    if (location.pathname === '/sales/app-orders' || location.pathname === '/sales/app-orders/') {
      navigate('/sales/app-orders/drafts', { replace: true });
      return;
    }
    if (!showReservations && location.pathname.startsWith('/sales/app-orders/reservations')) {
      navigate('/sales/app-orders/drafts', { replace: true });
    }
  }, [location.pathname, navigate, showReservations]);

  const activeKey =
    items.find((tab) => location.pathname.startsWith(tab.path))?.key ?? 'drafts';

  return (
    <div>
      <Tabs
        activeKey={activeKey}
        onChange={(key) => {
          const tab = items.find((item) => item.key === key);
          if (tab) navigate(tab.path);
        }}
        items={items.map(({ key, label }) => ({ key, label }))}
        style={{ marginBottom: 8 }}
      />
      <Outlet />
    </div>
  );
}
