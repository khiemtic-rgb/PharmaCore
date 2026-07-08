/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core';
import { precacheAndRoute } from 'workbox-precaching';

declare let self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>;
};

clientsClaim();

precacheAndRoute(self.__WB_MANIFEST);

self.addEventListener('install', () => {
  void self.skipWaiting();
});

self.addEventListener('push', (event: PushEvent) => {
  event.waitUntil(
    (async () => {
      let title = 'KitPlatform';
      let body = 'You have a new notification';
      let data: unknown;

      try {
        const payload = event.data?.json() as { title?: string; body?: string; data?: unknown } | undefined;
        if (payload?.title) title = payload.title;
        if (payload?.body) body = payload.body;
        data = payload?.data ?? payload;
      } catch {
        const text = event.data?.text();
        if (text) body = text;
      }

      await self.registration.showNotification(title, {
        body,
        icon: '/icon-512.png',
        badge: '/icon-512.png',
        data,
      });
    })(),
  );
});

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();
  event.waitUntil(
    (async () => {
      const payload = event.notification.data as { type?: string; url?: string } | undefined;
      const targetUrl =
        payload?.type === 'staff_chat_reply' || payload?.url === '/chat'
          ? '/chat'
          : payload?.type === 'customer_draft_order' || payload?.url === '/orders'
            ? '/orders'
            : '/reminders';

      const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of clients) {
        if ('focus' in client) {
          await client.focus();
          if ('navigate' in client && typeof client.navigate === 'function') {
            await client.navigate(targetUrl);
          }
          return;
        }
      }
      await self.clients.openWindow(targetUrl);
    })(),
  );
});

export {};
