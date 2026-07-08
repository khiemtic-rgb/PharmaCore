export async function ensureDesktopNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

export function showDesktopNotification(title: string, body: string, tag?: string) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  try {
    new Notification(title, {
      body,
      tag: tag ?? 'kitplatform-admin-chat',
      silent: false,
    });
  } catch {
    // ignore — một số trình duyệt chặn khi chưa có user gesture
  }
}
