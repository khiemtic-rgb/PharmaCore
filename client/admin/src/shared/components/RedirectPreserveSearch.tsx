import { Navigate, useLocation } from 'react-router-dom';

/** Redirect giữ query string (deep link cũ → route mới). */
export function RedirectPreserveSearch({ to }: { to: string }) {
  const { search } = useLocation();
  return <Navigate to={`${to}${search}`} replace />;
}
