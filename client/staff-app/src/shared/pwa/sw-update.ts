import { registerSW } from 'virtual:pwa-register';

let setupDone = false;

/** Đăng ký SW và tự reload khi có bản mới — tránh kẹt cache PWA trên điện thoại. */
export function setupServiceWorkerUpdates() {
  if (setupDone || !('serviceWorker' in navigator)) return;
  setupDone = true;

  registerSW({
    immediate: true,
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;
      window.setInterval(() => {
        void registration.update();
      }, 60_000);
    },
    onNeedRefresh() {
      window.location.reload();
    },
    onOfflineReady() {
      // no-op
    },
  });
}
