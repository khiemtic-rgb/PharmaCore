import { registerSW } from 'virtual:pwa-register';

let setupDone = false;
let readyPromise: Promise<ServiceWorkerRegistration> | null = null;

function getServiceWorkerScriptUrl() {
  return import.meta.env.DEV ? '/dev-sw.js?dev-sw' : '/sw.js';
}

function createReadyPromise() {
  return new Promise<ServiceWorkerRegistration>((resolve, reject) => {
    let settled = false;
    const finish = (reg: ServiceWorkerRegistration) => {
      if (settled) return;
      settled = true;
      resolve(reg);
    };
    const fail = (error: unknown) => {
      if (settled) return;
      settled = true;
      reject(error instanceof Error ? error : new Error('Không đăng ký được service worker.'));
    };

    registerSW({
      immediate: true,
      onRegisteredSW(_swUrl, registration) {
        if (registration?.active || registration?.installing || registration?.waiting) {
          finish(registration);
          return;
        }
        navigator.serviceWorker.ready.then(finish).catch(fail);
      },
      onRegisterError(error) {
        fail(normalizeServiceWorkerError(error));
      },
    });

    window.setTimeout(() => {
      void (async () => {
        try {
          let registration = await navigator.serviceWorker.getRegistration('/');
          if (!registration) {
            registration = await navigator.serviceWorker.register(getServiceWorkerScriptUrl(), {
              scope: '/',
              type: 'module',
            });
          }
          finish(await navigator.serviceWorker.ready);
        } catch (error) {
          fail(normalizeServiceWorkerError(error));
        }
      })();
    }, 800);
  });
}

export function setupServiceWorkerRegistration() {
  if (setupDone || !('serviceWorker' in navigator)) return;
  setupDone = true;
  readyPromise = createReadyPromise();
}

export async function waitForServiceWorkerRegistration(timeoutMs = 20_000) {
  if (!('serviceWorker' in navigator)) {
    throw new Error('Trình duyệt không hỗ trợ service worker.');
  }

  if (!readyPromise) {
    setupServiceWorkerRegistration();
  }

  const registration = await Promise.race([
    readyPromise!,
    new Promise<ServiceWorkerRegistration>((_, reject) => {
      window.setTimeout(
        () =>
          reject(
            new Error(
              'Service worker chưa sẵn sàng. Tải lại trang, đợi 3–5 giây rồi bấm lại.',
            ),
          ),
        timeoutMs,
      );
    }),
  ]);

  if (!registration.active) {
    return withTimeout(
      navigator.serviceWorker.ready,
      timeoutMs,
      'Service worker chưa active. Tải lại trang rồi thử lại.',
    );
  }

  return registration;
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      window.setTimeout(() => reject(new Error(message)), ms);
    }),
  ]);
}

function normalizeServiceWorkerError(error: unknown): Error {
  const text = error instanceof Error ? error.message : String(error);
  if (/ssl certificate error/i.test(text)) {
    return new Error(
      'Chứng chỉ HTTPS dev không hợp lệ với service worker. Mở http://localhost:5174 (không dùng https) rồi thử lại.',
    );
  }
  return error instanceof Error ? error : new Error(text || 'Không đăng ký được service worker.');
}
