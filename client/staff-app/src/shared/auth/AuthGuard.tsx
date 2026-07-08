import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/shared/auth/auth.store';

export function AuthGuard() {
  if (!useAuthStore((s) => s.isAuthenticated())) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}

export function GuestGuard() {
  if (useAuthStore((s) => s.isAuthenticated())) {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
}
