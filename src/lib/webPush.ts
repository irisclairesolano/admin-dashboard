import { adminApi } from '@/lib/api';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function isWebPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export async function getAdminPushSubscription(): Promise<PushSubscription | null> {
  if (!isWebPushSupported()) return null;
  const registration = await navigator.serviceWorker.register('/sw.js');
  return registration.pushManager.getSubscription();
}

export async function subscribeAdminWebPush(): Promise<PushSubscription | null> {
  if (!isWebPushSupported()) {
    throw new Error('Background push notifications are not supported in this browser.');
  }

  const permission =
    Notification.permission === 'granted'
      ? 'granted'
      : await Notification.requestPermission();

  if (permission !== 'granted') {
    throw new Error('Browser notification permission was not granted.');
  }

  const registration = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;

  const existing = await registration.pushManager.getSubscription();
  if (existing) {
    const json = existing.toJSON();
    if (json.endpoint && json.keys?.p256dh && json.keys?.auth) {
      await adminApi.subscribePush({
        endpoint: json.endpoint,
        keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
      });
    }
    return existing;
  }

  const keyRes = await adminApi.getVapidPublicKey();
  const publicKey = keyRes?.data?.public_key;
  if (!publicKey) {
    throw new Error('Server VAPID public key is not configured.');
  }

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey) as unknown as BufferSource,
  });

  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    throw new Error('Browser returned an incomplete push subscription.');
  }

  await adminApi.subscribePush({
    endpoint: json.endpoint,
    keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
  });

  return subscription;
}

export async function unsubscribeAdminWebPush(): Promise<void> {
  if (!isWebPushSupported()) return;
  const registration = await navigator.serviceWorker.getRegistration('/sw.js');
  if (!registration) return;
  const existing = await registration.pushManager.getSubscription();
  if (!existing) return;

  const endpoint = existing.endpoint;
  await existing.unsubscribe();
  if (endpoint) {
    await adminApi.unsubscribePush(endpoint).catch(() => {});
  }
}
