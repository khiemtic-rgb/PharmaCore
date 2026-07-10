import { useEffect, useState } from 'react';
import { fetchKapAccess } from '@/shared/api/kap-admin.api';

export function useKapAdminAccess() {
  const [enabled, setEnabled] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetchKapAccess()
      .then((res) => {
        if (!cancelled) setEnabled(res.enabled);
      })
      .catch(() => {
        if (!cancelled) setEnabled(false);
      })
      .finally(() => {
        if (!cancelled) setChecked(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { enabled, checked };
}
