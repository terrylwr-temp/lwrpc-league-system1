"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

function isMobileDevice() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(pointer: coarse), (max-width: 1023px)").matches;
}

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = `${base64String}${padding}`.replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index);
  }

  return outputArray;
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
  if (status === "blocked") return "App Notifications Blocked";
  if (status === "unsupported") return "App Notifications Unavailable";
  return "App Notifications";
}

export default function AppNotificationsButton({ phone = "", groupId = "", compact = false }) {
  const [visible, setVisible] = useState(false);
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    function updateVisible() {
      setVisible(isMobileDevice());
    }

    updateVisible();
    const query = window.matchMedia("(pointer: coarse), (max-width: 1023px)");
    if (query.addEventListener) query.addEventListener("change", updateVisible);
    else query.addListener(updateVisible);

    if (!browserSupported()) setStatus("unsupported");
    else if (Notification.permission === "denied") setStatus("blocked");

    return () => {
      if (query.removeEventListener) query.removeEventListener("change", updateVisible);
      else query.removeListener(updateVisible);
    };
  }, []);

  async function enableNotifications() {
    if (!browserSupported()) {
      setStatus("unsupported");
      setMessage("This browser does not support App Notifications.");
      return;
    }

    setStatus("working");
    setMessage("");

    try {
      const keyResponse = await fetch("/api/app-notifications/public-key");
      const keyResult = await keyResponse.json().catch(() => ({}));
      if (!keyResult.configured || !keyResult.publicKey) {
        throw new Error("App Notifications need the server notification keys before they can be turned on.");
      }

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "blocked" : "idle");
        setMessage(permission === "denied" ? "Notifications are blocked in this browser." : "Notifications were not turned on.");
        return;
      }

      const registration = await serviceWorkerRegistration();
      const existing = await registration.pushManager.getSubscription();
      const subscription = existing || await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(keyResult.publicKey),
      });

      const saveResponse = await fetch("/api/app-notifications/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "subscribe",
          scope: "pbcc",
          phone,
          groupId,
          subscription: subscription.toJSON(),
        }),
      });
      const saveResult = await saveResponse.json().catch(() => ({}));
      if (!saveResponse.ok || !saveResult.success) {
        throw new Error(saveResult.error || "Unable to save App Notifications.");
      }

      setStatus("enabled");
      setMessage("Text messages will still be used if an app notification cannot be delivered.");
    } catch (error) {
      setStatus("idle");
      setMessage(error.message || "Unable to enable App Notifications.");
    }
  }

  if (!visible) return null;

  return (
    <div className={compact ? "" : "mt-3"}>
      <button
        type="button"
        onClick={enableNotifications}
        disabled={status === "working" || status === "unsupported" || status === "blocked"}
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
    </div>
  );
}
