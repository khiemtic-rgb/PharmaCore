import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  BankOutlined,
  CloudOutlined,
  FileSearchOutlined,
  MobileOutlined,
  PrinterOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { resolveAdminVertical } from '@/modules/registry';
import { useRegisterSimpleModuleSubnav } from '@/shared/components/module-subnav.context';
import { useTenantPlatformStore } from '@/shared/platform/tenant-platform.store';

export function SystemLayout() {
  const { t } = useTranslation('system', { keyPrefix: 'systemLayout.tabs' });
  const location = useLocation();
  const navigate = useNavigate();
  const platformVertical = useTenantPlatformStore((s) => s.settings?.vertical);
  const adminVertical = resolveAdminVertical(platformVertical);

  const tabs = useMemo(() => {
    const all = [
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
        pharmacyOnly: true as const,
      },
      {
        key: 'customer-app-settings',
        label: t('customerAppSettings'),
        path: '/system/customer-app-settings',
        icon: <MobileOutlined />,
        pharmacyOnly: true as const,
      },
      { key: 'audit-log', label: t('auditLog'), path: '/system/audit-log', icon: <FileSearchOutlined /> },
    ];

    return all
      .filter((tab) => !('pharmacyOnly' in tab && tab.pharmacyOnly && adminVertical === 'clinic'))
      .map((tab) => {
        const { pharmacyOnly: _p, ...rest } = tab as typeof tab & { pharmacyOnly?: boolean };
        return rest;
      });
  }, [t, adminVertical]);

  useEffect(() => {
    if (location.pathname === '/system' || location.pathname === '/system/') {
      navigate('/system/branches', { replace: true });
      return;
    }

    const onPharmacyOnlyTab =
      location.pathname.startsWith('/system/pos-settings') ||
      location.pathname.startsWith('/system/customer-app-settings');
    if (adminVertical === 'clinic' && onPharmacyOnlyTab) {
      navigate('/system/platform-pack', { replace: true });
    }
  }, [location.pathname, navigate, adminVertical]);

  const activeKey =
    tabs.find((tab) => location.pathname.startsWith(tab.path))?.key ?? 'branches';

  useRegisterSimpleModuleSubnav(tabs, activeKey, navigate);

  return <Outlet />;
}
