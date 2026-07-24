import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/shared/auth/auth.store';
import { useSyncCurrentUser } from '@/shared/auth/useSyncCurrentUser';

export function AuthGuard() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  const location = useLocation();
  useSyncCurrentUser();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}

export function GuestGuard() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
