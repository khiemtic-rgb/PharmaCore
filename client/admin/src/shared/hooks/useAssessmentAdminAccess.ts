import { useEffect, useState } from 'react';
import { fetchAssessmentAdminAccess } from '@/shared/api/assessment-admin.api';

/** Chỉ bật trên deployment vận hành Novixa (Platform:EnableAssessmentLeadsAdmin). */
export function useAssessmentAdminAccess() {
  const [enabled, setEnabled] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetchAssessmentAdminAccess()
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
