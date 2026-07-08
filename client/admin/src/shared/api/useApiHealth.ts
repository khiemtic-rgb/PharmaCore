import { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { apiPath } from '@/shared/api/api-base';

function healthUrl(): string {
  return apiPath('/api/health');
}
const POLL_ONLINE_MS = 15_000;
const POLL_OFFLINE_MS = 5_000;
const RETRY_AFTER_FAIL_MS = 1_200;
/** Tránh banner đỏ nhấp nháy khi API cold-start / mạng chậm */
const FAILS_BEFORE_OFFLINE = 2;

export function useApiHealth() {
  const [online, setOnline] = useState(true);
  const [checking, setChecking] = useState(false);
  const failStreakRef = useRef(0);
  const retryTimerRef = useRef<number | undefined>(undefined);

  const recheck = useCallback(async () => {
    setChecking(true);
    try {
      const { data } = await axios.get<{ status?: string }>(healthUrl(), { timeout: 8_000 });
      if (data.status === 'ok') {
        failStreakRef.current = 0;
        setOnline(true);
      } else {
        failStreakRef.current += 1;
        if (failStreakRef.current >= FAILS_BEFORE_OFFLINE) setOnline(false);
        else {
          retryTimerRef.current = window.setTimeout(() => void recheck(), RETRY_AFTER_FAIL_MS);
        }
      }
    } catch {
      failStreakRef.current += 1;
      if (failStreakRef.current >= FAILS_BEFORE_OFFLINE) {
        setOnline(false);
      } else {
        retryTimerRef.current = window.setTimeout(() => void recheck(), RETRY_AFTER_FAIL_MS);
      }
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    void recheck();
    const onVisible = () => {
      if (document.visibilityState === 'visible') void recheck();
    };
    document.addEventListener('visibilitychange', onVisible);
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void recheck();
    }, POLL_ONLINE_MS);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.clearInterval(timer);
      if (retryTimerRef.current) window.clearTimeout(retryTimerRef.current);
    };
  }, [recheck]);

  useEffect(() => {
    if (online) return;
    const fastTimer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void recheck();
    }, POLL_OFFLINE_MS);
    return () => window.clearInterval(fastTimer);
  }, [online, recheck]);

  return { online, checking, recheck };
};
