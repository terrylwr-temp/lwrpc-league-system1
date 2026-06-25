"use client";

import { useEffect, useState } from "react";
import { APP_VERSION, COPYRIGHT_YEAR } from "../lib/version";
import { DEFAULT_SYSTEM_SETTINGS, mergeSystemSettings } from "../lib/systemSettings";

export default function SystemFooter() {
  const [settings, setSettings] = useState(DEFAULT_SYSTEM_SETTINGS);
  const [footerVersion, setFooterVersion] = useState("");

  useEffect(() => {
    let isMounted = true;
    setFooterVersion(APP_VERSION);

    async function loadSettings() {
      try {
        const response = await fetch("/api/system-settings");
        const result = await response.json().catch(() => ({}));
        if (isMounted && result.success) {
          setSettings(mergeSystemSettings(result.settings));
        }
      } catch {
        if (isMounted) setSettings(DEFAULT_SYSTEM_SETTINGS);
      }
    }

    loadSettings();
    return () => {
      isMounted = false;
    };
  }, []);

  const clubName = settings.club_name || DEFAULT_SYSTEM_SETTINGS.club_name;
  const footerText = `\u00A9 ${COPYRIGHT_YEAR} ${clubName} · Version ${footerVersion || ""}`;

  return (
    <>
      <div aria-hidden="true" className="system-footer-spacer h-8 shrink-0 print:hidden" />
      <footer className="system-footer fixed inset-x-0 bottom-0 z-40 flex h-8 items-center justify-center border-t border-slate-200/80 bg-white/95 px-3 text-center text-[10px] font-semibold text-slate-500 shadow-[0_-4px_14px_-12px_rgba(15,23,42,0.55)] backdrop-blur print:hidden sm:text-xs">
        <div className="max-w-full truncate">{footerText}</div>
      </footer>
    </>
  );
}
