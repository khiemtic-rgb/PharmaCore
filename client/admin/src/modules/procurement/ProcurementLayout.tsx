import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  ContainerOutlined,
  FileTextOutlined,
  PercentageOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { useRegisterProductNavSubnav } from '@/shared/components/module-subnav.context';
import type { ProductNavTab } from '@/shared/product/product-phases';
import { useProductNavGuard } from '@/shared/product/useProductNavGuard';
import { ProcurementOnboardingBanner } from '@/modules/procurement/ProcurementOnboardingBanner';

export function ProcurementLayout() {
  const { t } = useTranslation('procurement', { keyPrefix: 'procurementLayout.tabs' });
  const location = useLocation();
  const navigate = useNavigate();

  const allTabs: ProductNavTab[] = useMemo(
    () => [
      { key: 'suppliers', label: t('suppliers'), path: '/procurement/suppliers', icon: <TeamOutlined /> },
      {
        key: 'orders',
        label: t('orders'),
        path: '/procurement/purchase-orders',
        icon: <FileTextOutlined />,
      },
      {
        key: 'receipts',
        label: t('receipts'),
        path: '/procurement/goods-receipts',
        icon: <ContainerOutlined />,
      },
      {
        key: 'vat-settings',
        label: t('vatSettings'),
        path: '/procurement/vat-treatments',
        icon: <PercentageOutlined />,
        feature: 'procurement.vatAdmin',
      },
    ],
    [t],
  );

  const tabs = useProductNavGuard(allTabs, '/procurement/suppliers');

  useEffect(() => {
    if (location.pathname === '/procurement' || location.pathname === '/procurement/') {
      navigate('/procurement/suppliers', { replace: true });
    }
  }, [location.pathname, navigate]);

  const activeKey = tabs.find((tab) => location.pathname.startsWith(tab.path))?.key ?? 'suppliers';

  useRegisterProductNavSubnav(tabs, activeKey, (tab) => navigate(tab.path));

  return (
    <>
      <ProcurementOnboardingBanner />
      <Outlet />
    </>
  );
}
