import { lazy, Suspense, type ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Spin } from 'antd';
import { AuthGuard, GuestGuard } from '@/shared/auth/AuthGuard';

const PartnerPortalLayout = lazy(() =>
  import('@/shared/components/PartnerPortalLayout').then((m) => ({ default: m.PartnerPortalLayout })),
);
const LoginPage = lazy(() => import('@/modules/auth/LoginPage').then((m) => ({ default: m.LoginPage })));
const HomePage = lazy(() => import('@/modules/home/HomePage').then((m) => ({ default: m.HomePage })));
const ReferralPage = lazy(() => import('@/modules/home/ReferralPage').then((m) => ({ default: m.ReferralPage })));
const LeadsPage = lazy(() => import('@/modules/leads/LeadsPage').then((m) => ({ default: m.LeadsPage })));

function RouteFallback() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Spin size="large" />
    </div>
  );
}

function SuspenseRoute({ children }: { children: ReactNode }) {
  return <Suspense fallback={<RouteFallback />}>{children}</Suspense>;
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route element={<GuestGuard />}>
            <Route path="/login" element={<SuspenseRoute><LoginPage /></SuspenseRoute>} />
          </Route>
          <Route element={<AuthGuard />}>
            <Route element={<SuspenseRoute><PartnerPortalLayout /></SuspenseRoute>}>
              <Route index element={<SuspenseRoute><HomePage /></SuspenseRoute>} />
              <Route path="referral" element={<SuspenseRoute><ReferralPage /></SuspenseRoute>} />
              <Route path="leads" element={<SuspenseRoute><LeadsPage /></SuspenseRoute>} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
