import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  BankOutlined,
  CloudOutlined,
  FileSearchOutlined,
  FormOutlined,
  MobileOutlined,
  PrinterOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useRegisterSimpleModuleSubnav } from '@/shared/components/module-subnav.context';
import { useAssessmentAdminAccess } from '@/shared/hooks/useAssessmentAdminAccess';

export function SystemLayout() {
  const { t } = useTranslation('system', { keyPrefix: 'systemLayout.tabs' });
  const location = useLocation();
  const navigate = useNavigate();
  const { enabled: assessmentLeadsEnabled, checked: assessmentAccessChecked } = useAssessmentAdminAccess();

  const tabs = useMemo(() => {
    const base = [
      { key: 'branches', label: t('branches'), path: '/system/branches', icon: <BankOutlined /> },
      { key: 'users', label: t('users'), path: '/system/users', icon: <UserOutlined /> },
      { key: 'roles', label: t('roles'), path: '/system/roles', icon: <SafetyCertificateOutlined /> },
      {
        key: 'platform-pack',
        label: t('platformPack'),
        path: '/system/platform-pack',
        icon: <CloudOutlined />,
      },
      {
        key: 'pos-settings',
        label: t('posSettings'),
        path: '/system/pos-settings',
        icon: <PrinterOutlined />,
      },
      {
        key: 'customer-app-settings',
        label: t('customerAppSettings'),
        path: '/system/customer-app-settings',
        icon: <MobileOutlined />,
      },
      { key: 'audit-log', label: t('auditLog'), path: '/system/audit-log', icon: <FileSearchOutlined /> },
    ];
    if (assessmentLeadsEnabled) {
      base.push({
        key: 'assessment-leads',
        label: t('assessmentLeads'),
        path: '/system/assessment-leads',
        icon: <FormOutlined />,
      });
    }
    return base;
  }, [assessmentLeadsEnabled, t]);

  useEffect(() => {
    if (
      assessmentAccessChecked &&
      !assessmentLeadsEnabled &&
      location.pathname.startsWith('/system/assessment-leads')
    ) {
      navigate('/system/branches', { replace: true });
    }
  }, [assessmentAccessChecked, assessmentLeadsEnabled, location.pathname, navigate]);

  useEffect(() => {
    if (location.pathname === '/system' || location.pathname === '/system/') {
      navigate('/system/branches', { replace: true });
    }
  }, [location.pathname, navigate]);

  const activeKey =
    tabs.find((tab) => location.pathname.startsWith(tab.path))?.key ?? 'branches';

  useRegisterSimpleModuleSubnav(tabs, activeKey, navigate);

  return <Outlet />;
}
