"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { DEFAULT_SYSTEM_SETTINGS, mergeSystemSettings } from "../lib/systemSettings";

export default function LoadingScreen({
  title = "",
  subtitle = "Loading..."
}) {
  const [systemSettings, setSystemSettings] = useState(DEFAULT_SYSTEM_SETTINGS);
  const clubName = systemSettings.club_name || DEFAULT_SYSTEM_SETTINGS.club_name;
  const systemName = title || systemSettings.system_name || DEFAULT_SYSTEM_SETTINGS.system_name;
  const logoUrl = systemSettings.logo_url || DEFAULT_SYSTEM_SETTINGS.logo_url;

  useEffect(() => {
    async function loadSystemSettings() {
      const response = await fetch("/api/system-settings");
      const result = await response.json().catch(() => ({}));

      if (result.settings) {
        setSystemSettings(mergeSystemSettings(result.settings));
      }
    }

    loadSystemSettings();
  }, []);

  return (
    <main className="full-screen-main flex min-h-screen items-center justify-center bg-slate-100 p-6">
      <div className="w-full max-w-md rounded-3xl bg-white p-10 text-center shadow-2xl">
        <Image
          src={logoUrl}
          alt={clubName}
          width={112}
          height={112}
          className="mx-auto h-28 w-28 rounded-full bg-white object-contain"
          unoptimized
        />

        <h1 className="mt-6 text-3xl font-black text-slate-900">
          {clubName}
          <span className="mt-1 block text-xl text-blue-700">
            {systemName}
          </span>
        </h1>

        <p className="mt-2 text-sm font-medium text-slate-500">
          {subtitle}
        </p>

        <div className="mt-8 flex justify-center">
          <Image
            src="/favicon.ico"
            alt="Loading"
            width={64}
            height={64}
            className="h-16 w-16 animate-spin object-contain"
          />
        </div>

      </div>
    </main>
  );
}
