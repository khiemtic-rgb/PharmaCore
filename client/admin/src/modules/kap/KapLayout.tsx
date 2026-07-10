import { useEffect, useMemo } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  FormOutlined,
  FundOutlined,
  ProfileOutlined,
  RocketOutlined,
  TeamOutlined,
  UsergroupAddOutlined,
} from '@ant-design/icons';
import { useRegisterSimpleModuleSubnav } from '@/shared/components/module-subnav.context';
import { useKapAdminAccess } from '@/shared/hooks/useKapAdminAccess';

export function KapLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { enabled, checked } = useKapAdminAccess();

  const tabs = useMemo(
    () => [
      { key: 'leads', label: 'Leads', path: '/kap/leads', icon: <TeamOutlined /> },
      { key: 'partners', label: 'Đối tác', path: '/kap/partners', icon: <UsergroupAddOutlined /> },
      { key: 'templates', label: 'Biểu mẫu', path: '/kap/templates', icon: <ProfileOutlined /> },
      { key: 'rules', label: 'Rules', path: '/kap/rules', icon: <FundOutlined /> },
      { key: 'campaigns', label: 'Campaign', path: '/kap/campaigns', icon: <RocketOutlined /> },
    ],
    [],
  );

  useEffect(() => {
    if (checked && !enabled) navigate('/', { replace: true });
  }, [checked, enabled, navigate]);

  useEffect(() => {
    if (location.pathname === '/kap' || location.pathname === '/kap/') {
      navigate('/kap/leads', { replace: true });
    }
  }, [location.pathname, navigate]);

  const activeKey = tabs.find((tab) => location.pathname.startsWith(tab.path))?.key ?? 'leads';
  useRegisterSimpleModuleSubnav(tabs, activeKey, navigate);

  if (!checked || !enabled) return null;

  return (
    <div>
      <div style={{ marginBottom: 12, padding: '8px 12px', background: '#f0fdfa', borderRadius: 8 }}>
        <FormOutlined style={{ color: '#0f766e', marginRight: 8 }} />
        <strong>KIT Assessment Platform (KAP)</strong>
        <span style={{ marginLeft: 8, color: '#64748b', fontSize: 13 }}>
          Thu thập · Đánh giá · Insight · Lead
        </span>
      </div>
      <Outlet />
    </div>
  );
}
