import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChartOutlined,
  InboxOutlined,
  ShoppingOutlined,
  ShopOutlined,
} from '@ant-design/icons';
import { moduleTabsShellStyle } from '@/shared/components/module-tabs.ui';
import { useRegisterProductNavSubnav } from '@/shared/components/module-subnav.context';
import type { ProductNavTab } from '@/shared/product/product-phases';
import { useProductNavGuard } from '@/shared/product/useProductNavGuard';
import { ReportCategoryNav } from '@/modules/reports/ReportCategoryNav';
import { useCanReportsRead } from '@/shared/auth/usePermission';

export function ReportsLayout() {
  const { t } = useTranslation('reports', { keyPrefix: 'layout.tabs' });
  const location = useLocation();
  const navigate = useNavigate();
  const canReports = useCanReportsRead();

  const allTabs: ProductNavTab[] = useMemo(
    () => [
      {
        key: 'home',
        label: t('home'),
        path: '/reports',
        icon: <BarChartOutlined />,
      },
      {
        key: 'sales',
        label: t('sales'),
        path: '/reports/sales/revenue-by-period',
        icon: <ShopOutlined />,
      },
      {
        key: 'procurement',
        label: t('procurement'),
        path: '/reports/procurement/grn-value',
        icon: <ShoppingOutlined />,
      },
      {
        key: 'inventory',
        label: t('inventory'),
        path: '/reports/inventory/stock-snapshot',
        icon: <InboxOutlined />,
      },
    ],
    [t],
  );

  useProductNavGuard(allTabs, '/reports');

  useEffect(() => {
    if (location.pathname === '/reports/') {
      navigate('/reports', { replace: true });
    }
  }, [location.pathname, navigate]);

  const activeKey =
    location.pathname.startsWith('/reports/sales')
      ? 'sales'
      : location.pathname.startsWith('/reports/procurement')
        ? 'procurement'
        : location.pathname.startsWith('/reports/inventory')
          ? 'inventory'
          : 'home';

  useRegisterProductNavSubnav(allTabs, activeKey, (tab) => navigate(tab.path));

  if (!canReports) {
    return <Navigate to="/" replace />;
  }

  return (
    <div>
      <div style={moduleTabsShellStyle}>
        <ReportCategoryNav />
      </div>
      <Outlet />
    </div>
  );
}
