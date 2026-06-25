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

  return (
    <footer className="system-footer mt-auto border-t border-slate-200 bg-white px-4 py-3 text-center text-xs font-semibold text-slate-500 print:hidden">
      {"\u00A9"} {COPYRIGHT_YEAR} {clubName}. All rights reserved. Version {footerVersion || ""}.
    </footer>
  );
}
