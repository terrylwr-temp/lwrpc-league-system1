"use client";

import { useEffect } from "react";

const LMS_HEAD_ELEMENTS = [
  { id: "lms-pwa-manifest", tag: "link", attrs: { rel: "manifest", href: "/lms-manifest.webmanifest" } },
  { id: "lms-pwa-theme-color", tag: "meta", attrs: { name: "theme-color", content: "#1d4ed8" } },
  { id: "lms-pwa-apple-capable", tag: "meta", attrs: { name: "apple-mobile-web-app-capable", content: "yes" } },
  { id: "lms-pwa-apple-title", tag: "meta", attrs: { name: "apple-mobile-web-app-title", content: "LWR PB Club System" } },
  { id: "lms-pwa-apple-status", tag: "meta", attrs: { name: "apple-mobile-web-app-status-bar-style", content: "default" } },
  { id: "lms-pwa-apple-icon", tag: "link", attrs: { rel: "apple-touch-icon", href: "/lms-icon-192.png" } },
];

export default function LmsPwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || window.location.pathname.startsWith("/pbcc")) return undefined;

    LMS_HEAD_ELEMENTS.forEach(({ id, tag, attrs }) => {
      let element = document.getElementById(id);
      if (!element) {
        element = document.createElement(tag);
        element.id = id;
        document.head.appendChild(element);
      }

      Object.entries(attrs).forEach(([name, value]) => element.setAttribute(name, value));
    });

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/lms-sw.js", { scope: "/" }).catch(console.error);
    }

    return () => {
      LMS_HEAD_ELEMENTS.forEach(({ id }) => document.getElementById(id)?.remove());
    };
  }, []);

  return null;
}
