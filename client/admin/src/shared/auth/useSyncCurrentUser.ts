import { useEffect } from 'react';
import { meApi } from '@/shared/api/auth.api';
import { useAuthStore } from '@/shared/auth/auth.store';

const SYNC_INTERVAL_MS = 60_000;
let lastSyncAt = 0;

async function syncCurrentUser() {
  const { accessToken, user, setUser } = useAuthStore.getState();
  if (!accessToken) return;
  const now = Date.now();
  if (now - lastSyncAt < SYNC_INTERVAL_MS) return;
  lastSyncAt = now;
  try {
    const fresh = await meApi();
    if (JSON.stringify(fresh) !== JSON.stringify(user)) setUser(fresh);
  } catch {
    /* offline hoặc token hết hạn — interceptor xử lý */
  }
}

/** Đồng bộ quyền user từ server khi mở app / quay lại tab (phân quyền đổi không cần đăng nhập lại). */
export function useSyncCurrentUser() {
  useEffect(() => {
    void syncCurrentUser();
    const onVisible = () => {
      if (document.visibilityState === 'visible') void syncCurrentUser();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);
}
