"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { appConfirm } from "../lib/appDialog";
import {
  APP_NOTIFICATION_MIGRATION_ERROR_MESSAGE,
  enableCurrentPushSubscription,
  reconcileExistingPushSubscription,
} from "../lib/appNotificationBrowser.js";

function isMobileDevice() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(pointer: coarse), (max-width: 1023px)").matches;
}

function browserSupported() {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window
  );
}

async function serviceWorkerRegistration() {
  return navigator.serviceWorker.register("/pbcc-sw.js", { scope: "/pbcc/" });
}

function buttonText(status) {
  if (status === "enabled") return "App Notifications On";
  if (status === "working") return "Turning On...";
  if (status === "working-off") return "Turning Off...";
  if (status === "blocked") return "App Notifications Blocked";
  if (status === "unsupported") return "App Notifications Unavailable";
  return "App Notifications";
}

async function publicKeyConfiguration() {
  const response = await fetch("/api/app-notifications/public-key");
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.configured || !result.publicKey) {
    throw new Error("App Notifications need the server notification keys before they can be turned on.");
  }
  return result.publicKey;
}

async function saveBrowserSubscription(action, subscription, { phone, groupId }) {
  const response = await fetch("/api/app-notifications/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action,
      scope: "pbcc",
      phone,
      groupId,
      subscription: subscription.toJSON(),
    }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.success) {
    const fallback = action === "unsubscribe"
      ? "Unable to turn off App Notifications."
      : "Unable to save App Notifications.";
    throw new Error(result.error || fallback);
  }
  return result;
}

export default function AppNotificationsButton({ phone = "", groupId = "", compact = false, iconOnly = false }) {
  const [visible, setVisible] = useState(false);
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const [statusModal, setStatusModal] = useState(null);
  const automaticCheckRef = useRef(null);

  useEffect(() => {
    function updateVisible() {
      setVisible(isMobileDevice());
    }

    updateVisible();
    const query = window.matchMedia("(pointer: coarse), (max-width: 1023px)");
    if (query.addEventListener) query.addEventListener("change", updateVisible);
    else query.addListener(updateVisible);

    return () => {
      if (query.removeEventListener) query.removeEventListener("change", updateVisible);
      else query.removeListener(updateVisible);
    };
  }, []);

  useEffect(() => {
    if (!browserSupported()) {
      setStatus("unsupported");
      return undefined;
    }
    if (Notification.permission === "denied") {
      setStatus("blocked");
      return undefined;
    }
    if (Notification.permission !== "granted" || !phone || !groupId) return undefined;

    const identity = `${groupId}:${phone}`;
    if (!automaticCheckRef.current || automaticCheckRef.current.identity !== identity) {
      const promise = (async () => {
        const registration = await serviceWorkerRegistration();
        const subscription = await registration.pushManager.getSubscription();
        if (!subscription) return { status: "none", subscription: null };

        const publicKey = await publicKeyConfiguration();
        return reconcileExistingPushSubscription({
          subscription,
          publicKey,
          disableSubscription: (oldSubscription) => saveBrowserSubscription("unsubscribe", oldSubscription, { phone, groupId }),
          createSubscription: (applicationServerKey) => registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey,
          }),
          saveSubscription: (newSubscription) => saveBrowserSubscription("subscribe", newSubscription, { phone, groupId }),
        });
      })();
      automaticCheckRef.current = { identity, promise };
    }

    let active = true;
    automaticCheckRef.current.promise
      .then((result) => {
        if (!active) return;
        if (result.status === "none") {
          setStatus("idle");
          return;
        }
        setStatus("enabled");
        if (result.status === "migrated") {
          setMessage("App Notifications were securely updated for this device. Text messages remain available as backup.");
        }
      })
      .catch(() => {
        if (!active) return;
        setStatus("idle");
        setMessage(APP_NOTIFICATION_MIGRATION_ERROR_MESSAGE);
      });

    return () => {
      active = false;
    };
  }, [groupId, phone]);

  async function enableNotifications() {
    if (!browserSupported()) {
      setStatus("unsupported");
      setMessage("This browser does not support App Notifications.");
      return;
    }

    setStatus("working");
    setMessage("");

    try {
      const publicKey = await publicKeyConfiguration();

      const permission = Notification.permission === "granted"
        ? "granted"
        : await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "blocked" : "idle");
        setMessage(permission === "denied" ? "Notifications are blocked in this browser." : "Notifications were not turned on.");
        return;
      }

      const registration = await serviceWorkerRegistration();
      const existing = await registration.pushManager.getSubscription();
      await enableCurrentPushSubscription({
        subscription: existing,
        publicKey,
        disableSubscription: (oldSubscription) => saveBrowserSubscription("unsubscribe", oldSubscription, { phone, groupId }),
        createSubscription: (applicationServerKey) => registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey,
        }),
        saveSubscription: (subscription) => saveBrowserSubscription("subscribe", subscription, { phone, groupId }),
      });

      setStatus("enabled");
      setMessage("Text messages will still be used if an app notification cannot be delivered.");
      setStatusModal({
        title: "App Notifications Are On",
        message: "PBCourtCommand can now send notifications to this device for your sessions. Text messages will still be used if an app notification cannot be delivered.",
      });
    } catch (error) {
      setStatus("idle");
      setMessage(error.message || "Unable to enable App Notifications.");
    }
  }

  async function disableNotifications() {
    if (!browserSupported()) {
      setStatus("unsupported");
      setMessage("This browser does not support App Notifications.");
      return;
    }

    const confirmed = await appConfirm("Turn off App Notifications on this device? Text messages will still be used as backup.", { title: "Turn off App Notifications", confirmLabel: "Turn off", tone: "warning" });
    if (!confirmed) return;

    setStatus("working-off");
    setMessage("");

    try {
      const registration = await serviceWorkerRegistration();
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await saveBrowserSubscription("unsubscribe", subscription, { phone, groupId });
        await subscription.unsubscribe();
      }

      setStatus("idle");
      setMessage("App Notifications are off on this device. Text messages will still be used.");
      setStatusModal({
        title: "App Notifications Are Off",
        message: "PBCourtCommand will no longer send app notifications to this device. You will still receive text messages for your sessions.",
      });
    } catch (error) {
      setStatus("enabled");
      setMessage(error.message || "Unable to turn off App Notifications.");
    }
  }

  function handleNotificationsClick() {
    if (status === "enabled") {
      disableNotifications();
      return;
    }

    enableNotifications();
  }

  if (!visible) return null;

  const notificationStatusModal = statusModal && (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/55 p-4" role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="app-notifications-status-title"
        className="w-full max-w-sm rounded-2xl border border-emerald-100 bg-white p-5 text-center shadow-2xl"
      >
        <Image src="/favicon.ico" alt="" width={48} height={48} className="mx-auto h-12 w-12 rounded-xl bg-emerald-50 object-contain" />
        <h2 id="app-notifications-status-title" className="mt-3 text-lg font-black text-slate-950">
          {statusModal.title}
        </h2>
        <p className="mt-2 text-sm font-medium leading-relaxed text-slate-700">{statusModal.message}</p>
        <button
          type="button"
          onClick={() => setStatusModal(null)}
          className="mt-5 w-full rounded-xl bg-emerald-700 px-4 py-3 text-sm font-black text-white transition hover:bg-emerald-800"
        >
          Got It
        </button>
      </div>
    </div>
  );

  if (iconOnly) {
    return (
      <>
        <button
          type="button"
          onClick={handleNotificationsClick}
          disabled={status === "working" || status === "working-off" || status === "unsupported" || status === "blocked"}
          aria-label={buttonText(status)}
          title={buttonText(status)}
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 bg-white shadow-[0_10px_22px_-14px_rgba(20,184,166,0.95)] ring-1 ring-white/25 transition hover:-translate-y-0.5 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60 ${
            status === "enabled" ? "border-emerald-300" : "border-teal-200"
          }`}
        >
          <Image src="/favicon.ico" alt="" width={34} height={34} className="h-8 w-8 object-contain" />
        </button>
        {message && (
          <div className="fixed inset-x-3 bottom-4 z-50 rounded-lg border border-emerald-200 bg-white px-4 py-3 text-center text-xs font-bold leading-relaxed text-slate-800 shadow-[0_18px_48px_-22px_rgba(15,23,42,0.95)]">
            {message}
          </div>
        )}
        {notificationStatusModal}
      </>
    );
  }

  return (
    <div className={compact ? "" : "mt-3"}>
      <button
        type="button"
        onClick={handleNotificationsClick}
        disabled={status === "working" || status === "working-off" || status === "unsupported" || status === "blocked"}
        className="flex w-full items-center justify-center gap-3 rounded-xl border-2 border-emerald-700 bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-950 shadow-[0_12px_26px_-18px_rgba(4,120,87,0.95)] transition hover:-translate-y-0.5 hover:bg-emerald-100 hover:shadow-md disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-100 disabled:text-slate-500"
      >
        <Image src="/favicon.ico" alt="" width={32} height={32} className="h-8 w-8 rounded-lg bg-white object-contain shadow-sm" />
        <span>{buttonText(status)}</span>
      </button>
      {message && (
        <div className="mt-2 rounded-lg border border-emerald-100 bg-white/80 px-3 py-2 text-xs font-bold leading-relaxed text-slate-700">
          {message}
        </div>
      )}
      {notificationStatusModal}
    </div>
  );
}
