import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Badge } from 'antd';
import {
  HomeOutlined,
  MedicineBoxOutlined,
  MessageOutlined,
  ShoppingOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ApiHealthBanner } from '@/shared/components/ApiHealthBanner';
import { BrandingLogo } from '@/shared/components/BrandingLogo';
import { useCustomerBranding } from '@/shared/config/BrandingProvider';
import { prefetchOverviewForPath } from '@/shared/api/overview-queries';
import { useCustomerChatUnread } from '@/shared/hooks/useCustomerChatUnread';
import { useCustomerDraftOrderAlerts } from '@/shared/hooks/useCustomerDraftOrderAlerts';
import { preloadRouteChunk } from '@/shared/routing/route-preload';

export function CustomerAppLayout() {
  const { t } = useTranslation();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { branding } = useCustomerBranding();
  const chatUnread = useCustomerChatUnread();
  const draftOrderAlerts = useCustomerDraftOrderAlerts();
  const isChat = location.pathname.startsWith('/chat');

  const tabs = [
    { to: '/', icon: <HomeOutlined />, label: t('nav.home') },
    { to: '/orders', icon: <ShoppingOutlined />, label: t('nav.orders') },
    { to: '/reminders', icon: <MedicineBoxOutlined />, label: t('nav.reminders') },
    { to: '/chat', icon: <MessageOutlined />, label: t('nav.chat') },
    { to: '/profile', icon: <UserOutlined />, label: t('nav.account') },
  ] as const;

  const headerGradient = `linear-gradient(135deg, ${branding.primaryColor}, ${branding.secondaryColor})`;

  const warmTab = (path: string) => {
    if (path === '/') return;
    preloadRouteChunk(path);
    void prefetchOverviewForPath(queryClient, path);
  };

  return (
    <div className={`customer-app-shell${isChat ? ' customer-app-shell--chat' : ''}`}>
      <header className="customer-app-header" style={{ background: headerGradient }}>
        <div className="customer-app-header-inner">
          <div className="customer-app-header-brand">
            <BrandingLogo logoUrl={branding.logoUrl} />
            <div className="customer-app-header-text">
              <div className="customer-app-header-title">{branding.appName}</div>
              {branding.tagline ? (
                <div className="customer-app-header-tagline">{branding.tagline}</div>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      <main
        className={
          isChat ? 'customer-app-content customer-app-content--chat' : 'customer-app-content'
        }
      >
        {!isChat ? (
          <div className="customer-app-banner-wrap">
            <ApiHealthBanner />
          </div>
        ) : null}
        <Outlet />
      </main>

      <nav className="customer-app-bottom-nav" aria-label={t('nav.main')}>
        <div className="customer-app-bottom-nav-inner">
          {tabs.map((tab) => {
            const active =
              tab.to === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(tab.to);
            const showDraftBadge = tab.to === '/orders' && draftOrderAlerts > 0 && !active;
            const showChatBadge = tab.to === '/chat' && chatUnread > 0 && !active;

            return (
              <NavLink
                key={tab.to}
                to={tab.to}
                end={tab.to === '/'}
                className={({ isActive }) =>
                  `customer-app-bottom-nav-item${isActive ? ' customer-app-bottom-nav-item--active' : ''}`
                }
                onTouchStart={() => warmTab(tab.to)}
                onMouseEnter={() => warmTab(tab.to)}
                onFocus={() => warmTab(tab.to)}
              >
                {showDraftBadge ? (
                  <Badge
                    count={draftOrderAlerts > 99 ? '99+' : draftOrderAlerts}
                    size="small"
                    offset={[-2, 2]}
                  >
                    <span className="customer-app-bottom-nav-icon">{tab.icon}</span>
                  </Badge>
                ) : showChatBadge ? (
                  <Badge count={chatUnread > 99 ? '99+' : chatUnread} size="small" offset={[-2, 2]}>
                    <span className="customer-app-bottom-nav-icon">{tab.icon}</span>
                  </Badge>
                ) : (
                  <span className="customer-app-bottom-nav-icon">{tab.icon}</span>
                )}
                <span className="customer-app-bottom-nav-label">{tab.label}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
