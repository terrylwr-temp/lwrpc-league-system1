"use client";

import { useEffect } from "react";

const PBCC_PWA_VERSION = "pbcc-pickleball-full-20260621";

const PBCC_HEAD_ELEMENTS = [
  { id: "pbcc-pwa-manifest", tag: "link", attrs: { rel: "manifest", href: `/pbcc-manifest.webmanifest?v=${PBCC_PWA_VERSION}` } },
  { id: "pbcc-pwa-theme-color", tag: "meta", attrs: { name: "theme-color", content: "#0f766e" } },
  { id: "pbcc-pwa-apple-capable", tag: "meta", attrs: { name: "apple-mobile-web-app-capable", content: "yes" } },
  { id: "pbcc-pwa-apple-title", tag: "meta", attrs: { name: "apple-mobile-web-app-title", content: "PBCourtCommand" } },
  { id: "pbcc-pwa-apple-status", tag: "meta", attrs: { name: "apple-mobile-web-app-status-bar-style", content: "default" } },
  { id: "pbcc-pwa-apple-icon", tag: "link", attrs: { rel: "apple-touch-icon", href: `/pbcc-pickleball-full-icon-192.png?v=${PBCC_PWA_VERSION}` } },
];

function isPbccPath(pathname) {
  return pathname.startsWith("/pbcc") || pathname.startsWith("/round-robin/rpro");
}

export default function PbccPwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !isPbccPath(window.location.pathname)) return undefined;

    PBCC_HEAD_ELEMENTS.forEach(({ id, tag, attrs }) => {
      let element = document.getElementById(id);
      if (!element) {
        element = document.createElement(tag);
        element.id = id;
        document.head.appendChild(element);
      }

      Object.entries(attrs).forEach(([name, value]) => element.setAttribute(name, value));
    });

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/pbcc-sw.js", { scope: "/pbcc/", updateViaCache: "none" }).catch(console.error);
    }

    return () => {
      PBCC_HEAD_ELEMENTS.forEach(({ id }) => document.getElementById(id)?.remove());
    };
  }, []);

  return null;
}
