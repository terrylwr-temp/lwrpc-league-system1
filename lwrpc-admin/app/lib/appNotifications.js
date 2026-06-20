import { createClient } from "@supabase/supabase-js";
import webPush from "web-push";

const DEFAULT_PUSH_TITLE = "PBCourtCommand";
const DEFAULT_PUSH_URL = "/pbcc/player";
const DEFAULT_PUSH_ICON = "/favicon.ico";

let vapidConfigured = false;

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE ||
    process.env.SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("App Notifications require Supabase service-role configuration.");
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export function normalizeAppNotificationPhone(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  if (text.startsWith("+")) return `+${text.replace(/\D/g, "")}`;

  const digits = text.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return digits ? `+${digits}` : "";
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function cleanUnique(values, normalizer = (value) => String(value || "").trim()) {
  return [...new Set((values || []).map(normalizer).filter(Boolean))];
}

export function appNotificationsConfigured() {
  return Boolean(
    (process.env.WEB_PUSH_PUBLIC_KEY || process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY) &&
    process.env.WEB_PUSH_PRIVATE_KEY
  );
}

export function publicVapidKey() {
  return process.env.WEB_PUSH_PUBLIC_KEY || process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY || "";
}

function configureVapid() {
  if (vapidConfigured) return;
  const publicKey = publicVapidKey();
  const privateKey = process.env.WEB_PUSH_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    throw new Error("Missing WEB_PUSH_PUBLIC_KEY or WEB_PUSH_PRIVATE_KEY.");
  }

  webPush.setVapidDetails(
    process.env.WEB_PUSH_SUBJECT || "mailto:info@lwrpickleballclub.com",
    publicKey,
    privateKey
  );
  vapidConfigured = true;
}

function subscriptionObject(row) {
  return {
    endpoint: row.endpoint,
    keys: {
      p256dh: row.p256dh,
      auth: row.auth,
    },
  };
}

function notificationPayload({ title, body, url, tag, icon }) {
  return JSON.stringify({
    title: title || DEFAULT_PUSH_TITLE,
    body: body || "You have a new league notification.",
    url: url || DEFAULT_PUSH_URL,
    tag: tag || "lwrpc-app-notification",
    icon: icon || DEFAULT_PUSH_ICON,
    badge: icon || DEFAULT_PUSH_ICON,
  });
}

async function loadSubscriptions(supabase, { phones, emails }) {
  const normalizedPhones = cleanUnique(phones, normalizeAppNotificationPhone);
  const normalizedEmails = cleanUnique(emails, normalizeEmail);
  const rowsByEndpoint = new Map();

  if (normalizedPhones.length > 0) {
    const { data, error } = await supabase
      .from("app_notification_subscriptions")
      .select("id, endpoint, p256dh, auth, recipient_phone, recipient_email")
      .eq("enabled", true)
      .in("recipient_phone", normalizedPhones);
    if (error) throw error;
    (data || []).forEach((row) => rowsByEndpoint.set(row.endpoint, row));
  }

  if (normalizedEmails.length > 0) {
    const { data, error } = await supabase
      .from("app_notification_subscriptions")
      .select("id, endpoint, p256dh, auth, recipient_phone, recipient_email")
      .eq("enabled", true)
      .in("recipient_email", normalizedEmails);
    if (error) throw error;
    (data || []).forEach((row) => rowsByEndpoint.set(row.endpoint, row));
  }

  return [...rowsByEndpoint.values()];
}

async function markSubscriptionSuccess(supabase, id) {
  await supabase
    .from("app_notification_subscriptions")
    .update({ last_success_at: new Date().toISOString(), last_error: null, updated_at: new Date().toISOString() })
    .eq("id", id);
}

async function markSubscriptionError(supabase, row, error) {
  const statusCode = Number(error?.statusCode || error?.status || 0);
  const payload = {
    last_error_at: new Date().toISOString(),
    last_error: error?.message || "App notification failed",
    updated_at: new Date().toISOString(),
  };
  if (statusCode === 404 || statusCode === 410) {
    payload.enabled = false;
  }

  await supabase
    .from("app_notification_subscriptions")
    .update(payload)
    .eq("id", row.id);
}

export async function sendAppNotificationMessages({ phones = [], emails = [], title, body, url, tag, icon } = {}) {
  const normalizedPhones = cleanUnique(phones, normalizeAppNotificationPhone);
  const normalizedEmails = cleanUnique(emails, normalizeEmail);
  const emptyFallback = { skipped: true, reason: "No App Notification recipients", sent: 0, results: [], fallbackPhones: normalizedPhones };

  if (normalizedPhones.length === 0 && normalizedEmails.length === 0) return emptyFallback;
  if (!appNotificationsConfigured()) {
    return { ...emptyFallback, reason: "App Notifications are not configured" };
  }

  let supabase;
  try {
    configureVapid();
    supabase = serviceClient();
    const subscriptions = await loadSubscriptions(supabase, { phones: normalizedPhones, emails: normalizedEmails });

    if (subscriptions.length === 0) {
      return { ...emptyFallback, reason: "No App Notification subscriptions" };
    }

    const payload = notificationPayload({ title, body, url, tag, icon });
    const results = await Promise.all(
      subscriptions.map(async (row) => {
        try {
          await webPush.sendNotification(subscriptionObject(row), payload);
          await markSubscriptionSuccess(supabase, row.id);
          return {
            ok: true,
            endpoint: row.endpoint,
            phone: row.recipient_phone || "",
            email: row.recipient_email || "",
            error: null,
          };
        } catch (error) {
          await markSubscriptionError(supabase, row, error);
          return {
            ok: false,
            endpoint: row.endpoint,
            phone: row.recipient_phone || "",
            email: row.recipient_email || "",
            error: error?.message || "App notification failed",
          };
        }
      })
    );

    const phonesWithPush = new Set(results.filter((result) => result.ok && result.phone).map((result) => result.phone));
    const fallbackPhones = normalizedPhones.filter((phone) => !phonesWithPush.has(phone));

    return {
      skipped: false,
      sent: results.filter((result) => result.ok).length,
      results,
      fallbackPhones,
    };
  } catch (error) {
    return {
      skipped: true,
      reason: error?.message || "App Notifications unavailable",
      sent: 0,
      results: [],
      fallbackPhones: normalizedPhones,
    };
  }
}
