import { useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Tabs } from 'antd';
import {
  AppstoreOutlined,
  ExperimentOutlined,
  FolderOutlined,
  TagOutlined,
} from '@ant-design/icons';
import {
  moduleTabsShellStyle,
  secondaryTabLabel,
  secondaryTabsBarStyle,
} from '@/shared/components/module-tabs.ui';

const tabs = [
  { key: 'products', label: 'Sản phẩm', path: '/catalog/products', icon: <AppstoreOutlined /> },
  { key: 'categories', label: 'Danh mục SP', path: '/catalog/categories', icon: <FolderOutlined /> },
  { key: 'brands', label: 'Thương hiệu', path: '/catalog/brands', icon: <TagOutlined /> },
  {
    key: 'ingredients',
    label: 'Hoạt chất',
    path: '/catalog/ingredients',
    icon: <ExperimentOutlined />,
  },
];

export function CatalogLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (location.pathname === '/catalog' || location.pathname === '/catalog/') {
      navigate('/catalog/products', { replace: true });
    }
  }, [location.pathname, navigate]);

  const activeKey = tabs.find((t) => location.pathname.startsWith(t.path))?.key ?? 'products';

  return (
    <div>
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
      <Outlet />
    </div>
  );
}
