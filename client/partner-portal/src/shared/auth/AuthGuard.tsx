import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/shared/auth/auth.store';

export function AuthGuard() {
  const ok = useAuthStore((s) => s.isAuthenticated());
  return ok ? <Outlet /> : <Navigate to="/login" replace />;
}

export function GuestGuard() {
  const ok = useAuthStore((s) => s.isAuthenticated());
  return ok ? <Navigate to="/" replace /> : <Outlet />;
}
