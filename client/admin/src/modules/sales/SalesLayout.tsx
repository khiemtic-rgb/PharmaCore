import { memo, Suspense, useCallback, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Badge, Spin } from 'antd';
import {
  ClockCircleOutlined,
  CommentOutlined,
  DollarOutlined,
  FileTextOutlined,
  FormOutlined,
  MedicineBoxOutlined,
  RollbackOutlined,
  ShoppingCartOutlined,
} from '@ant-design/icons';
import { readPosDraftEditId } from '@/modules/sales/sales-draft-helpers';
import { useAdminChatUnread } from '@/modules/sales/useAdminChatUnread';
import { usePendingCustomerDraftCount } from '@/modules/sales/usePendingCustomerDraftCount';
import { useHasPermission } from '@/shared/auth/usePermission';
import { ensureDesktopNotificationPermission } from '@/shared/utils/desktop-notification';
import { primaryTabLabel } from '@/shared/components/module-tabs.ui';
import type { ProductNavTab } from '@/shared/product/product-phases';
import { filterProductNavTabs } from '@/shared/product/product-phases';
import { useProductNavGuard } from '@/shared/product/useProductNavGuard';

const allMainTabs: ProductNavTab[] = [
  { key: 'pos', label: 'Bán hàng (POS)', path: '/sales/pos', icon: <ShoppingCartOutlined /> },
  { key: 'orders', label: 'Đơn bán', path: '/sales/orders', icon: <FileTextOutlined /> },
  {
    key: 'customer-receivables',
    label: 'Công nợ KH',
    path: '/sales/customer-receivables',
    icon: <DollarOutlined />,
    feature: 'sales.receivables',
  },
  {
    key: 'customer-payments',
    label: 'Thu nợ KH',
    path: '/sales/customer-payments',
    icon: <DollarOutlined />,
    feature: 'sales.customerPayments',
  },
  {
    key: 'customer-drafts',
    label: 'Đơn hàng từ app',
    path: '/sales/customer-drafts',
    icon: <FormOutlined />,
  },
  {
    key: 'customer-reservations',
    label: 'Đặt trước app',
    path: '/sales/customer-reservations',
    icon: <MedicineBoxOutlined />,
    feature: 'sales.customerReservations',
  },
  { key: 'returns', label: 'Hàng trả lại', path: '/sales/returns', icon: <RollbackOutlined /> },
  {
    key: 'chat',
    label: 'Chat KH',
    path: '/sales/chat',
    icon: <CommentOutlined />,
    feature: 'sales.chat',
  },
  { key: 'shift', label: 'Ca làm việc', path: '/sales/shift', icon: <ClockCircleOutlined /> },
];

const mainTabs = filterProductNavTabs(allMainTabs);

type SalesSubnavProps = {
  tabs: ProductNavTab[];
  activeKey: string;
  onNavigate: (tab: ProductNavTab) => void;
};

const SalesSubnav = memo(function SalesSubnav({ tabs, activeKey, onNavigate }: SalesSubnavProps) {
  const canReadSales = useHasPermission('sales.read');
  const chatUnread = useAdminChatUnread(canReadSales && tabs.some((t) => t.key === 'chat'));
  const pendingDrafts = usePendingCustomerDraftCount(canReadSales);

  return (
    <nav className="pos-sales-subnav" aria-label="Menu bán hàng">
      {tabs.map((t) => {
        const active = activeKey === t.key;
        const labelNode = primaryTabLabel(t.label, t.icon);
        return (
          <button
            key={t.key}
            type="button"
            className={
              active
                ? 'pos-sales-subnav__item pos-sales-subnav__item--active'
                : 'pos-sales-subnav__item'
            }
            onClick={() => onNavigate(t)}
          >
            {t.key === 'chat' && chatUnread > 0 ? (
              <Badge count={chatUnread} size="small" offset={[8, 0]}>
                {labelNode}
              </Badge>
            ) : t.key === 'customer-drafts' && pendingDrafts > 0 ? (
              <Badge count={pendingDrafts} size="small" offset={[8, 0]}>
                {labelNode}
              </Badge>
            ) : (
              labelNode
            )}
          </button>
        );
      })}
    </nav>
  );
});

export function SalesLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const isPosRoute = location.pathname.startsWith('/sales/pos');

  useProductNavGuard(allMainTabs, '/sales/pos');

  const activeMainTab =
    mainTabs.find((t) => location.pathname.startsWith(t.path))?.key ?? 'pos';

  useEffect(() => {
    if (location.pathname === '/sales' || location.pathname === '/sales/') {
      navigate('/sales/pos', { replace: true });
    }
  }, [location.pathname, navigate]);

  const navigateToTab = useCallback((tab: ProductNavTab) => {
    if (tab.key === 'chat') {
      void ensureDesktopNotificationPermission();
    }
    if (tab.key === 'pos') {
      const draftId = readPosDraftEditId();
      navigate(draftId ? `${tab.path}?draftId=${draftId}` : tab.path);
      return;
    }
    navigate(tab.path);
  }, [navigate]);

  return (
    <div
      className={isPosRoute ? 'sales-layout--pos' : 'sales-layout'}
    >
      <SalesSubnav tabs={mainTabs} activeKey={activeMainTab} onNavigate={navigateToTab} />

      <Suspense
        fallback={
          <div style={{ padding: 48, textAlign: 'center' }}>
            <Spin tip="Đang tải..." />
          </div>
        }
      >
        <div className={isPosRoute ? 'sales-layout__outlet sales-layout__outlet--pos' : 'sales-layout__outlet'}>
          <Outlet />
        </div>
      </Suspense>
    </div>
  );
}
