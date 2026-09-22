export const APP_NOTIFICATION_MIGRATION_ERROR_MESSAGE =
  "App Notifications need to be turned on again on this device. Text messages will still be used.";

export function urlBase64ToUint8Array(base64String) {
  const value = String(base64String || "").trim();
  if (!value) throw new Error("Missing App Notification public key.");

  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = `${value}${padding}`.replace(/-/g, "+").replace(/_/g, "/");
  const rawData = globalThis.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index);
  }

  return outputArray;
}

function applicationServerKeyBytes(value) {
  if (!value) return null;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (ArrayBuffer.isView(value)) {
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  }
  return null;
}

export function subscriptionUsesVapidPublicKey(subscription, publicKey) {
  try {
    const actual = applicationServerKeyBytes(subscription?.options?.applicationServerKey);
    const expected = urlBase64ToUint8Array(publicKey);
    if (!actual || actual.length !== expected.length) return false;
    return actual.every((byte, index) => byte === expected[index]);
  } catch {
    return false;
  }
}

export async function migrateLegacyPushSubscription({
  subscription,
  publicKey,
  disableSubscription,
  createSubscription,
  saveSubscription,
}) {
  await disableSubscription(subscription);
  const unsubscribed = await subscription.unsubscribe();
  if (unsubscribed === false) throw new Error("Unable to remove the old App Notification subscription.");

  const replacement = await createSubscription(urlBase64ToUint8Array(publicKey));
  await saveSubscription(replacement);
  return { status: "migrated", subscription: replacement };
}

export async function reconcileExistingPushSubscription(options) {
  const { subscription, publicKey } = options;
  if (!subscription) return { status: "none", subscription: null };
  if (subscriptionUsesVapidPublicKey(subscription, publicKey)) {
    return { status: "current", subscription };
  }
  return migrateLegacyPushSubscription(options);
}

export async function enableCurrentPushSubscription({
  subscription,
  publicKey,
  createSubscription,
  saveSubscription,
  disableSubscription,
}) {
  if (!subscription) {
    const created = await createSubscription(urlBase64ToUint8Array(publicKey));
    await saveSubscription(created);
    return { status: "created", subscription: created };
  }

  if (subscriptionUsesVapidPublicKey(subscription, publicKey)) {
    await saveSubscription(subscription);
    return { status: "current", subscription };
  }

  return migrateLegacyPushSubscription({
    subscription,
    publicKey,
    disableSubscription,
    createSubscription,
    saveSubscription,
  });
}
