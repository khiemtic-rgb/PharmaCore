import { useEffect } from 'react';
import { fetchTenantPlatformSettings } from '@/shared/platform/tenant-platform.api';
import { useTenantPlatformStore } from '@/shared/platform/tenant-platform.store';
import { useAuthStore } from '@/shared/auth/auth.store';

/** Loads tenant platform settings after admin login — fail-open until loaded (pilot-safe). */
export function TenantPlatformHydrator() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const setSettings = useTenantPlatformStore((s) => s.setSettings);
  const setLoaded = useTenantPlatformStore((s) => s.setLoaded);
  const clear = useTenantPlatformStore((s) => s.clear);

  useEffect(() => {
    if (!accessToken) {
      clear();
      return;
    }

    let cancelled = false;
    setLoaded(false);

    void fetchTenantPlatformSettings()
      .then((settings) => {
        if (!cancelled) {
          setSettings(settings);
          setLoaded(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSettings(null);
          setLoaded(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken, clear, setLoaded, setSettings]);

  return null;
}
