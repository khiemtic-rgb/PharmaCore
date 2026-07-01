import i18n from '@/shared/i18n';
import { waitForServiceWorkerRegistration } from '@/shared/push/sw-registration';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  if (outputArray.length !== 65 || outputArray[0] !== 0x04) {
    throw new Error(i18n.t('push.vapidKeyInvalid'));
  }
  return outputArray;
}

export function isPushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    throw new Error(i18n.t('push.notificationsUnsupported'));
  }
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error(i18n.t('push.permissionDenied'));
  }
  return permission;
}

export async function getServiceWorkerRegistration() {
  return waitForServiceWorkerRegistration();
}

export async function getCurrentPushSubscription() {
  const registration = await getServiceWorkerRegistration();
  return registration.pushManager.getSubscription();
}

export async function subscribePush(publicKey: string) {
  const registration = await getServiceWorkerRegistration();

  const existing = await registration.pushManager.getSubscription();
  const subscription =
    existing ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    }));

  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) {
    throw new Error(i18n.t('push.subscriptionReadFailed'));
  }

  return {
    endpoint: json.endpoint,
    p256dh: json.keys.p256dh,
    auth: json.keys.auth,
  };
}

export async function unsubscribePush() {
  const subscription = await getCurrentPushSubscription();
  if (!subscription) return null;
  const endpoint = subscription.endpoint;
  await subscription.unsubscribe();
  return endpoint;
}
