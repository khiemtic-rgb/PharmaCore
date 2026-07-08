const preloaded = new Set<string>();

function markPreloaded(key: string) {
  preloaded.add(key);
}

function preloadOnce(key: string, loader: () => Promise<unknown>) {
  if (preloaded.has(key)) return;
  markPreloaded(key);
  void loader();
}

export const preloadOrdersPage = () =>
  import('@/modules/orders/DraftOrdersPage').then((m) => ({ default: m.DraftOrdersPage }));

export const preloadRemindersPage = () =>
  import('@/modules/reminders/RemindersPage').then((m) => ({ default: m.RemindersPage }));

export const preloadChatPage = () => import('@/modules/chat/ChatPage').then((m) => ({ default: m.ChatPage }));

/** Preload lazy route chunk before navigation (touch/hover on bottom nav). */
export function preloadRouteChunk(path: string) {
  if (path === '/orders') {
    preloadOnce('orders', preloadOrdersPage);
    return;
  }
  if (path === '/reminders') {
    preloadOnce('reminders', preloadRemindersPage);
    return;
  }
  if (path === '/chat') {
    preloadOnce('chat', preloadChatPage);
  }
}
