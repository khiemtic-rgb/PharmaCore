import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import axios from 'axios';
import { apiPath } from '@/shared/api/api-base';

const HEALTH_URL = apiPath('/api/health');
const POLL_ONLINE_MS = 30_000;
const POLL_OFFLINE_MS = 5_000;
const HEALTH_TIMEOUT_MS = 5_000;
const RETRY_AFTER_FAIL_MS = 1_200;
/** Tránh banner nhấp nháy khi API cold-start / mạng chập chờn */
const FAILS_BEFORE_OFFLINE = 2;

type ApiHealthContextValue = {
  online: boolean;
  checking: boolean;
  recheck: () => Promise<void>;
};

const ApiHealthContext = createContext<ApiHealthContextValue | null>(null);

export function ApiHealthProvider({ children }: { children: ReactNode }) {
  const [online, setOnline] = useState(true);
  const [checking, setChecking] = useState(false);
  const failStreakRef = useRef(0);
  const retryTimerRef = useRef<number | undefined>(undefined);

  const recheck = useCallback(async () => {
    setChecking(true);
    try {
      const { data } = await axios.get<{ status?: string }>(HEALTH_URL, {
        timeout: HEALTH_TIMEOUT_MS,
      });
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

  const value = useMemo(
    () => ({ online, checking, recheck }),
    [online, checking, recheck],
  );

  return <ApiHealthContext.Provider value={value}>{children}</ApiHealthContext.Provider>;
}

export function useApiHealth(): ApiHealthContextValue {
  const ctx = useContext(ApiHealthContext);
  if (!ctx) {
    throw new Error('useApiHealth must be used within ApiHealthProvider');
  }
  return ctx;
}

/** Gọi lại khi API vừa online trở lại sau khi offline. */
export function useRetryWhenApiOnline(onOnline: () => void | Promise<void>) {
  const { online } = useApiHealth();
  const wasOfflineRef = useRef(false);
  const onOnlineRef = useRef(onOnline);
  onOnlineRef.current = onOnline;

  useEffect(() => {
    if (!online) {
      wasOfflineRef.current = true;
      return;
    }
    if (wasOfflineRef.current) {
      wasOfflineRef.current = false;
      void onOnlineRef.current();
    }
  }, [online]);
}
