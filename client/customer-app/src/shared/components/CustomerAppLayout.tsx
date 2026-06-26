import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Badge } from 'antd';
import { GiftOutlined, HomeOutlined, MedicineBoxOutlined, MessageOutlined, UserOutlined } from '@ant-design/icons';
import { ApiHealthBanner } from '@/shared/components/ApiHealthBanner';
import { useCustomerChatUnread } from '@/shared/hooks/useCustomerChatUnread';
import { useCustomerDraftOrderAlerts } from '@/shared/hooks/useCustomerDraftOrderAlerts';
const tabs = [
  { to: '/', icon: <HomeOutlined />, label: 'Trang chủ' },
  { to: '/loyalty', icon: <GiftOutlined />, label: 'Điểm thưởng' },
  { to: '/reminders', icon: <MedicineBoxOutlined />, label: 'Nhắc thuốc' },
  { to: '/chat', icon: <MessageOutlined />, label: 'Chat' },
  { to: '/profile', icon: <UserOutlined />, label: 'Tài khoản' },
] as const;

export function CustomerAppLayout() {
  const location = useLocation();
  const chatUnread = useCustomerChatUnread();
  const draftOrderAlerts = useCustomerDraftOrderAlerts();

  return (
    <div style={{ minHeight: '100vh', background: '#f0fdfa' }}>
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          background: 'linear-gradient(135deg, #0f766e, #115e59)',
          color: '#fff',
          padding: '14px 16px',
          boxShadow: '0 2px 8px rgba(15,118,110,0.25)',
        }}
      >
        <div style={{ maxWidth: 480, margin: '0 auto', fontWeight: 600, fontSize: 17 }}>
          PharmaCore Khách hàng
        </div>
      </header>

      <main className="customer-app-content">
        <div style={{ maxWidth: 480, margin: '0 auto', padding: '0 12px' }}>
          <ApiHealthBanner />
        </div>
        <Outlet />
      </main>

      <nav className="customer-app-bottom-nav" aria-label="Điều hướng chính">
        <div
          style={{
            maxWidth: 480,
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
          }}
        >
          {tabs.map((tab) => {
            const active =
              tab.to === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(tab.to);
            return (
              <NavLink
                key={tab.to}
                to={tab.to}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                  padding: '10px 4px',
                  textDecoration: 'none',
                  color: active ? '#0f766e' : '#64748b',
                  fontSize: 11,
                  fontWeight: active ? 600 : 500,
                }}
              >
                {tab.to === '/' && draftOrderAlerts > 0 && !active ? (
                  <Badge count={draftOrderAlerts > 99 ? '99+' : draftOrderAlerts} size="small" offset={[-2, 2]}>
                    <span style={{ fontSize: 20 }}>{tab.icon}</span>
                  </Badge>
                ) : tab.to === '/chat' && chatUnread > 0 && !active ? (
                  <Badge count={chatUnread > 99 ? '99+' : chatUnread} size="small" offset={[-2, 2]}>
                    <span style={{ fontSize: 20 }}>{tab.icon}</span>
                  </Badge>
                ) : (
                  <span style={{ fontSize: 20 }}>{tab.icon}</span>
                )}
                {tab.label}
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
