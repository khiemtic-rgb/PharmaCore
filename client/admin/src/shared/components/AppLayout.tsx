import { useMemo, useState } from 'react';

import { useTranslation } from 'react-i18next';

import { Layout, Menu, Dropdown, Avatar, Space, Typography, Tabs } from 'antd';

import {

  MenuFoldOutlined,

  MenuUnfoldOutlined,

  UserOutlined,

  LogoutOutlined,

} from '@ant-design/icons';

import { Outlet, useLocation, useNavigate } from 'react-router-dom';

import { moduleRegistry } from '@/modules/registry';

import type { ModuleKey } from '@/modules/registry';

import { useTenantPlatformStore } from '@/shared/platform/tenant-platform.store';

import { ApiHealthBanner } from '@/shared/components/ApiHealthBanner';
import {
  ModuleSubnavProvider,
  useModuleSubnavState,
} from '@/shared/components/module-subnav.context';

import { useAuthStore } from '@/shared/auth/auth.store';

import { logoutApi } from '@/shared/api/auth.api';

import { AdminLanguageSelect } from '@/shared/i18n/LanguageSelect';
import { AppBrandLogo } from '@/shared/components/AppBrandLogo';

const { Header, Sider, Content } = Layout;

function resolveActiveModuleKey(pathname: string): ModuleKey {

  if (pathname === '/') return 'dashboard';

  for (const module of moduleRegistry) {

    if (!module.enabled || module.key === 'dashboard') continue;

    const base = `/${module.path.split('/').filter(Boolean)[0]}`;

    if (pathname.startsWith(base)) return module.key;

  }

  return 'dashboard';

}



function AppLayoutShell() {

  const { t } = useTranslation('common');

  const [collapsed, setCollapsed] = useState(false);

  const navigate = useNavigate();

  const location = useLocation();
  const user = useAuthStore((s) => s.user);

  const refreshToken = useAuthStore((s) => s.refreshToken);

  const clearSession = useAuthStore((s) => s.clearSession);

  const subnav = useModuleSubnavState();
  const isModuleEnabled = useTenantPlatformStore((s) => s.isModuleEnabled);
  const platformLoaded = useTenantPlatformStore((s) => s.loaded);



  const activeKey = resolveActiveModuleKey(location.pathname);

  const activeModuleLabel = t(`modules.${activeKey}`);



  const menuItems = useMemo(

    () =>

      moduleRegistry.map((module) => {
        const platformOk =
          !module.platformModule || !platformLoaded || isModuleEnabled(module.platformModule);
        const navEnabled = module.enabled && platformOk;

        return {
          key: module.key,
          icon: module.icon,
          label: navEnabled
            ? t(`modules.${module.key}`)
            : t('modules.comingSoon', { name: t(`modules.${module.key}`) }),
          disabled: !navEnabled,
        };
      }),

    [t, isModuleEnabled, platformLoaded],

  );



  const handleLogout = async () => {

    try {

      if (refreshToken) {

        await logoutApi(refreshToken);

      }

    } catch {

      // ignore — still clear local session

    } finally {

      clearSession();

      navigate('/login', { replace: true });

    }

  };



  const userMenu = {

    items: [

      {

        key: 'logout',

        icon: <LogoutOutlined />,

        label: t('appLayout.logout'),

        onClick: handleLogout,

      },

    ],

  };



  return (

    <Layout style={{ minHeight: '100vh' }}>

      <Sider

        collapsible

        collapsed={collapsed}

        onCollapse={setCollapsed}

        breakpoint="lg"

        collapsedWidth={64}

        theme="dark"

        width={240}

        style={{ background: '#1b3a6b' }}

      >

        <div
          style={{
            height: 64,
            margin: collapsed ? '16px 8px' : 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <AppBrandLogo height={collapsed ? 36 : 48} maxWidth={collapsed ? 40 : 168} />
        </div>

        <Menu

          theme="dark"

          mode="inline"

          selectedKeys={[activeKey]}

          items={menuItems}

          onClick={({ key }) => {

            const module = moduleRegistry.find((m) => m.key === key);

            const platformOk =
              !module?.platformModule || !platformLoaded || isModuleEnabled(module.platformModule);

            if (module?.enabled && platformOk) {

              navigate(module.path);

            }

          }}

        />

      </Sider>

      <Layout style={{ minWidth: 0, overflow: 'hidden' }}>

        <Header className="app-header">

          <div className="app-header__left">

            <span

              className="app-header__toggle"

              onClick={() => setCollapsed((c) => !c)}

              role="button"

              tabIndex={0}

              onKeyDown={(e) => e.key === 'Enter' && setCollapsed((c) => !c)}

            >

              {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}

            </span>

            <Typography.Title level={5} className="app-header__module-title">

              {activeModuleLabel}

            </Typography.Title>

            {subnav ? (

              <>

                <span className="app-header__module-sep" aria-hidden>

                  |

                </span>

                <Tabs

                  className="app-header-module-tabs"

                  activeKey={subnav.activeKey}

                  size="small"

                  items={subnav.tabs}

                  onChange={subnav.onChange}

                />

              </>

            ) : null}

          </div>

          <Space size={12} style={{ flexShrink: 0, marginLeft: 12 }}>
            <AdminLanguageSelect />
            <Dropdown menu={userMenu} placement="bottomRight">
              <Space style={{ cursor: 'pointer' }}>
                <Avatar size="small" icon={<UserOutlined />} />
                <Typography.Text>{user?.username ?? 'Admin'}</Typography.Text>
              </Space>
            </Dropdown>
          </Space>

        </Header>

        <ApiHealthBanner />

        <Content className="app-main-content">

          <Outlet />

        </Content>

      </Layout>

    </Layout>

  );

}



export function AppLayout() {

  return (

    <ModuleSubnavProvider>

      <AppLayoutShell />

    </ModuleSubnavProvider>

  );

}


