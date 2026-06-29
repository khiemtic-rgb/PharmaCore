import { useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Tabs } from 'antd';
import { GiftOutlined, TagOutlined, UnorderedListOutlined } from '@ant-design/icons';
import {
  moduleTabsShellStyle,
  secondaryTabLabel,
  secondaryTabsBarStyle,
} from '@/shared/components/module-tabs.ui';
import type { ProductNavTab } from '@/shared/product/product-phases';
import { useProductNavGuard } from '@/shared/product/useProductNavGuard';

const allTabs: ProductNavTab[] = [
  { key: 'list', label: 'Danh sách', path: '/customer/list', icon: <UnorderedListOutlined /> },
  { key: 'loyalty', label: 'Tích điểm', path: '/customer/loyalty', icon: <GiftOutlined /> },
  {
    key: 'vouchers',
    label: 'Voucher',
    path: '/customer/vouchers',
    icon: <TagOutlined />,
    feature: 'sales.vouchers',
  },
];

export function CustomerLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const tabs = useProductNavGuard(allTabs, '/customer/list');

  useEffect(() => {
    if (location.pathname === '/customer' || location.pathname === '/customer/') {
      navigate('/customer/list', { replace: true });
    }
  }, [location.pathname, navigate]);

  const onDetailRoute =
    /^\/customer\/[^/]+/.test(location.pathname) &&
    !tabs.some((t) => location.pathname.startsWith(t.path));

  const activeKey = tabs.find((t) => location.pathname.startsWith(t.path))?.key ?? 'list';

  return (
    <div>
      {!onDetailRoute ? (
        <div style={moduleTabsShellStyle}>
          <div style={secondaryTabsBarStyle}>
            <Tabs
              activeKey={activeKey}
              size="small"
              items={tabs.map((t) => ({
                key: t.key,
                label: secondaryTabLabel(t.label, t.icon),
              }))}
              onChange={(key) => {
                const tab = tabs.find((t) => t.key === key);
                if (tab) navigate(tab.path);
              }}
            />
          </div>
        </div>
      ) : null}
      <Outlet />
    </div>
  );
}
