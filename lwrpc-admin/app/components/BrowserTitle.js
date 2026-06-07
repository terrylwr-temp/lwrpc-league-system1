"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  browserTabTitle,
  cacheSystemSettings,
  cachedSystemSettings,
  DEFAULT_SYSTEM_SETTINGS,
  mergeSystemSettings,
} from "../lib/systemSettings";

export default function BrowserTitle() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname === "/print") return;

    let isMounted = true;

    function applyTitle(settings) {
      if (typeof document === "undefined") return;
      document.title = browserTabTitle(settings);
    }

    applyTitle(cachedSystemSettings());

    async function loadTitle() {
      try {
        const response = await fetch("/api/system-settings");
        const result = await response.json().catch(() => ({}));
        const nextSettings = mergeSystemSettings(result.settings || DEFAULT_SYSTEM_SETTINGS);

        if (!isMounted) return;
        cacheSystemSettings(nextSettings);
        applyTitle(nextSettings);
      } catch {
        // Keep the cached or default title that was already applied above.
      }
    }

    loadTitle();

    return () => {
      isMounted = false;
    };
  }, [pathname]);

  return null;
}
