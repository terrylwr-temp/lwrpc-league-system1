import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import {
  appNotificationsConfigured,
  buildAppNotificationSubscriptionRecord,
  currentVapidKeyId,
  publicVapidKeysConsistent,
  vapidKeyIdForPublicKey,
} from "../app/lib/appNotificationVapid.js";
import {
  APP_NOTIFICATION_MIGRATION_ERROR_MESSAGE,
  enableCurrentPushSubscription,
  reconcileExistingPushSubscription,
  subscriptionUsesVapidPublicKey,
  urlBase64ToUint8Array,
} from "../app/lib/appNotificationBrowser.js";
import {
  fallbackPhonesForPushResults,
  loadSubscriptions,
} from "../app/lib/appNotifications.js";

const publicKey = Buffer.concat([Buffer.from([4]), Buffer.alloc(64, 7)]).toString("base64url");
const otherPublicKey = Buffer.concat([Buffer.from([4]), Buffer.alloc(64, 9)]).toString("base64url");

function keyBuffer(key = publicKey) {
  const bytes = urlBase64ToUint8Array(key);
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

function subscription(key = publicKey, events = []) {
  return {
    endpoint: "https://push.example.invalid/device",
    options: { applicationServerKey: keyBuffer(key) },
    toJSON() {
      return { endpoint: this.endpoint, keys: { p256dh: "public-client-key", auth: "auth-token" } };
    },
    async unsubscribe() {
      events.push("browser-unsubscribe");
      return true;
    },
  };
}

function fakeSupabase(rows) {
  return {
    from(table) {
      assert.equal(table, "app_notification_subscriptions");
      const filters = [];
      return {
        select() {
          return this;
        },
        eq(column, value) {
          filters.push((row) => row[column] === value);
          return this;
        },
        in(column, values) {
          const data = rows.filter((row) => filters.every((filter) => filter(row)) && values.includes(row[column]));
          return Promise.resolve({ data, error: null });
        },
      };
    },
  };
}

test("LMS-0756 App Notifications require a consistent public key and a private key", () => {
  const base = { WEB_PUSH_PUBLIC_KEY: publicKey, NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY: publicKey };
  assert.equal(appNotificationsConfigured(base), false);
  assert.equal(appNotificationsConfigured({ ...base, WEB_PUSH_PRIVATE_KEY: "synthetic-private" }), true);
  assert.equal(publicVapidKeysConsistent({ ...base, NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY: otherPublicKey }), false);
  assert.equal(appNotificationsConfigured({ ...base, NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY: otherPublicKey, WEB_PUSH_PRIVATE_KEY: "synthetic-private" }), false);
});

test("LMS-0756 VAPID key ID is deterministic, canonical, and independent of private material", () => {
  const padded = `${publicKey}${"=".repeat((4 - (publicKey.length % 4)) % 4)}`;
  const id = vapidKeyIdForPublicKey(publicKey);
  assert.equal(id, vapidKeyIdForPublicKey(padded));
  assert.equal(id, currentVapidKeyId({ WEB_PUSH_PUBLIC_KEY: publicKey, WEB_PUSH_PRIVATE_KEY: "private-one" }));
  assert.equal(id, currentVapidKeyId({ WEB_PUSH_PUBLIC_KEY: publicKey, WEB_PUSH_PRIVATE_KEY: "private-two" }));
  assert.match(id, /^[a-f0-9]{64}$/);
  assert.ok(!id.includes("private"));
});

test("LMS-0756 subscription records always use the server-derived VAPID key ID", () => {
  const environment = { WEB_PUSH_PUBLIC_KEY: publicKey, WEB_PUSH_PRIVATE_KEY: "synthetic-private" };
  const record = buildAppNotificationSubscriptionRecord({
    subscription: {
      endpoint: "https://push.example.invalid/device",
      p256dh: "p256dh",
      auth: "auth",
      vapid_key_id: "client-supplied-fake",
    },
    recipient: { app_scope: "pbcc", recipient_phone: "+19415550100" },
    userAgent: "test-browser",
    updatedAt: "2026-09-22T13:00:00.000Z",
  }, environment);

  assert.equal(record.vapid_key_id, vapidKeyIdForPublicKey(publicKey));
  assert.notEqual(record.vapid_key_id, "client-supplied-fake");
  assert.equal(record.enabled, true);
});

test("LMS-0756 delivery selection excludes stale and null-key subscriptions", async () => {
  const rows = [
    { id: "current", endpoint: "current", enabled: true, vapid_key_id: "current-key", recipient_phone: "+19415550100", recipient_email: null },
    { id: "stale", endpoint: "stale", enabled: true, vapid_key_id: "old-key", recipient_phone: "+19415550100", recipient_email: null },
    { id: "legacy", endpoint: "legacy", enabled: true, vapid_key_id: null, recipient_phone: "+19415550100", recipient_email: null },
  ];
  const selected = await loadSubscriptions(fakeSupabase(rows), {
    phones: ["941-555-0100"],
    emails: [],
    vapidKeyId: "current-key",
  });
  assert.deepEqual(selected.map((row) => row.id), ["current"]);
});

test("LMS-0756 stale subscriptions naturally preserve SMS fallback", () => {
  assert.deepEqual(fallbackPhonesForPushResults(["941-555-0100"], []), ["+19415550100"]);
  assert.deepEqual(
    fallbackPhonesForPushResults(["941-555-0100"], [{ ok: false, phone: "+19415550100" }]),
    ["+19415550100"]
  );
  assert.deepEqual(
    fallbackPhonesForPushResults(["941-555-0100"], [{ ok: true, phone: "+19415550100" }]),
    []
  );
});

test("LMS-0756 browser key comparison handles ArrayBuffer and typed-array values", () => {
  const exact = subscription();
  assert.equal(subscriptionUsesVapidPublicKey(exact, publicKey), true);

  const expected = urlBase64ToUint8Array(publicKey);
  const padded = new Uint8Array(expected.length + 2);
  padded.set(expected, 1);
  const typed = { options: { applicationServerKey: padded.subarray(1, expected.length + 1) } };
  assert.equal(subscriptionUsesVapidPublicKey(typed, publicKey), true);
  assert.equal(subscriptionUsesVapidPublicKey(exact, otherPublicKey), false);
  assert.equal(subscriptionUsesVapidPublicKey({ options: { applicationServerKey: null } }, publicKey), false);
  assert.equal(subscriptionUsesVapidPublicKey({ options: {} }, "not valid base64%%%"), false);
});

test("LMS-0756 automatic reconciliation does not opt in a browser without a subscription", async () => {
  let calls = 0;
  const result = await reconcileExistingPushSubscription({
    subscription: null,
    publicKey,
    disableSubscription: async () => { calls += 1; },
    createSubscription: async () => { calls += 1; },
    saveSubscription: async () => { calls += 1; },
  });
  assert.deepEqual(result, { status: "none", subscription: null });
  assert.equal(calls, 0);
});

test("LMS-0756 matching automatic subscription is not replaced or saved again", async () => {
  const existing = subscription();
  let calls = 0;
  const result = await reconcileExistingPushSubscription({
    subscription: existing,
    publicKey,
    disableSubscription: async () => { calls += 1; },
    createSubscription: async () => { calls += 1; },
    saveSubscription: async () => { calls += 1; },
  });
  assert.equal(result.status, "current");
  assert.equal(result.subscription, existing);
  assert.equal(calls, 0);
});

test("LMS-0756 stale automatic subscription is disabled, removed, recreated, and saved in order", async () => {
  const events = [];
  const existing = subscription(otherPublicKey, events);
  const replacement = subscription(publicKey);
  const result = await reconcileExistingPushSubscription({
    subscription: existing,
    publicKey,
    disableSubscription: async (value) => {
      assert.equal(value, existing);
      events.push("server-disable-old");
    },
    createSubscription: async (applicationServerKey) => {
      assert.deepEqual([...applicationServerKey], [...urlBase64ToUint8Array(publicKey)]);
      events.push("browser-create-current");
      return replacement;
    },
    saveSubscription: async (value) => {
      assert.equal(value, replacement);
      events.push("server-save-current");
    },
  });
  assert.equal(result.status, "migrated");
  assert.deepEqual(events, ["server-disable-old", "browser-unsubscribe", "browser-create-current", "server-save-current"]);
});

test("LMS-0756 failed automatic migration reports failure and leaves SMS guidance", async () => {
  const existing = subscription(otherPublicKey);
  await assert.rejects(() => reconcileExistingPushSubscription({
    subscription: existing,
    publicKey,
    disableSubscription: async () => {},
    createSubscription: async () => { throw new Error("synthetic create failure"); },
    saveSubscription: async () => {},
  }), /synthetic create failure/);
  assert.match(APP_NOTIFICATION_MIGRATION_ERROR_MESSAGE, /turned on again/i);
  assert.match(APP_NOTIFICATION_MIGRATION_ERROR_MESSAGE, /Text messages will still be used/i);
});

test("LMS-0756 manual enable creates a current subscription and preserves matching subscriptions", async () => {
  const events = [];
  const created = subscription(publicKey);
  const first = await enableCurrentPushSubscription({
    subscription: null,
    publicKey,
    disableSubscription: async () => events.push("unexpected-disable"),
    createSubscription: async () => {
      events.push("create");
      return created;
    },
    saveSubscription: async (value) => {
      assert.equal(value, created);
      events.push("save");
    },
  });
  assert.equal(first.status, "created");
  assert.deepEqual(events, ["create", "save"]);

  events.length = 0;
  const second = await enableCurrentPushSubscription({
    subscription: created,
    publicKey,
    disableSubscription: async () => events.push("unexpected-disable"),
    createSubscription: async () => events.push("unexpected-create"),
    saveSubscription: async () => events.push("save-current"),
  });
  assert.equal(second.status, "current");
  assert.deepEqual(events, ["save-current"]);
});

test("LMS-0756 migration is additive, idempotent, and leaves existing rows unchanged", async () => {
  const migration = await readFile(new URL("../supabase/migrations/20260922131117_app_notification_vapid_key_id.sql", import.meta.url), "utf8");
  assert.match(migration, /add column if not exists vapid_key_id text/i);
  assert.doesNotMatch(migration, /\b(update|delete|insert)\b/i);

  const db = new PGlite();
  await db.exec("create table public.app_notification_subscriptions (id bigint generated always as identity primary key, enabled boolean not null default true);");
  await db.exec("insert into public.app_notification_subscriptions (enabled) values (true), (false);");
  await db.exec(migration);
  await db.exec(migration);
  const result = await db.query("select enabled, vapid_key_id from public.app_notification_subscriptions order by id");
  assert.deepEqual(result.rows, [
    { enabled: true, vapid_key_id: null },
    { enabled: false, vapid_key_id: null },
  ]);
  await db.close();
});

test("LMS-0756 routes retain View-As rejection and never expose private-key material", async () => {
  const subscribeRoute = await readFile(new URL("../app/api/app-notifications/subscribe/route.js", import.meta.url), "utf8");
  const publicKeyRoute = await readFile(new URL("../app/api/app-notifications/public-key/route.js", import.meta.url), "utf8");
  assert.match(subscribeRoute, /rejectViewAsMutation\(req\)/);
  assert.match(subscribeRoute, /buildAppNotificationSubscriptionRecord/);
  assert.doesNotMatch(subscribeRoute, /body\.vapid_key_id/);
  assert.match(publicKeyRoute, /rejectViewAsMutation\(request\)/);
  assert.doesNotMatch(publicKeyRoute, /WEB_PUSH_PRIVATE_KEY/);
});
