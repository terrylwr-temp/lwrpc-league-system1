import { createHash } from "node:crypto";

function clean(value) {
  return String(value || "").trim();
}

export function publicVapidKey(environment = process.env) {
  return clean(environment.WEB_PUSH_PUBLIC_KEY) || clean(environment.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY);
}

export function publicVapidKeysConsistent(environment = process.env) {
  const serverKey = clean(environment.WEB_PUSH_PUBLIC_KEY);
  const browserKey = clean(environment.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY);
  return !serverKey || !browserKey || serverKey === browserKey;
}

export function appNotificationsConfigured(environment = process.env) {
  return Boolean(
    publicVapidKey(environment) &&
    clean(environment.WEB_PUSH_PRIVATE_KEY) &&
    publicVapidKeysConsistent(environment)
  );
}

function publicKeyBytes(publicKey) {
  const value = clean(publicKey);
  if (!value) throw new Error("Missing WEB_PUSH_PUBLIC_KEY.");

  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const normalized = `${value}${padding}`.replace(/-/g, "+").replace(/_/g, "/");
  const bytes = Buffer.from(normalized, "base64");
  if (bytes.length === 0) throw new Error("Invalid WEB_PUSH_PUBLIC_KEY.");
  return bytes;
}

export function vapidKeyIdForPublicKey(publicKey) {
  return createHash("sha256").update(publicKeyBytes(publicKey)).digest("hex");
}

export function currentVapidKeyId(environment = process.env) {
  return vapidKeyIdForPublicKey(publicVapidKey(environment));
}

export function buildAppNotificationSubscriptionRecord(
  { subscription, recipient, userAgent = "", updatedAt = new Date().toISOString() },
  environment = process.env
) {
  return {
    endpoint: clean(subscription?.endpoint),
    p256dh: clean(subscription?.p256dh || subscription?.keys?.p256dh),
    auth: clean(subscription?.auth || subscription?.keys?.auth),
    ...recipient,
    user_agent: clean(userAgent).slice(0, 500),
    vapid_key_id: currentVapidKeyId(environment),
    enabled: true,
    updated_at: updatedAt,
  };
}
