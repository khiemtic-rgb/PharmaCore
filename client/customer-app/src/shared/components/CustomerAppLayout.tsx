import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { GiftOutlined, HomeOutlined, MedicineBoxOutlined, UserOutlined } from '@ant-design/icons';

const tabs = [
  { to: '/', icon: <HomeOutlined />, label: 'Trang chủ' },
  { to: '/loyalty', icon: <GiftOutlined />, label: 'Điểm thưởng' },
  { to: '/reminders', icon: <MedicineBoxOutlined />, label: 'Nhắc thuốc' },
  { to: '/profile', icon: <UserOutlined />, label: 'Tài khoản' },
] as const;

export function CustomerAppLayout() {
  const location = useLocation();

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
        <Outlet />
      </main>

      <nav className="customer-app-bottom-nav" aria-label="Điều hướng chính">
        <div
          style={{
            maxWidth: 480,
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
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
                <span style={{ fontSize: 20 }}>{tab.icon}</span>
                {tab.label}
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
