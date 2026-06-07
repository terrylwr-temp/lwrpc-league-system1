"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import AppHeader from "../components/AppHeader";
import { requireRole, supabase } from "../lib/auth";
import { browserTabTitle, DEFAULT_SYSTEM_SETTINGS, SYSTEM_SETTING_FIELDS, cacheSystemSettings, mergeSystemSettings } from "../lib/systemSettings";
import { useUnsavedChangesWarning } from "../lib/useUnsavedChangesWarning";
import { useRouter } from "next/navigation";

export default function SystemSetupPage() {
  const router = useRouter();
  const [settings, setSettings] = useState(DEFAULT_SYSTEM_SETTINGS);
  const [savedSettings, setSavedSettings] = useState(DEFAULT_SYSTEM_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [schemaWarning, setSchemaWarning] = useState("");

  const dirty = JSON.stringify(settings) !== JSON.stringify(savedSettings);
  useUnsavedChangesWarning(dirty, "club setup");

  const loadSettings = useCallback(async function loadSettings() {
    const response = await fetch("/api/system-settings");
    const result = await response.json().catch(() => ({}));
    const nextSettings = mergeSystemSettings(result.settings || DEFAULT_SYSTEM_SETTINGS);

    setSettings(nextSettings);
    setSavedSettings(nextSettings);
    cacheSystemSettings(nextSettings);
    setSchemaWarning(result.warning || (result.schemaMissing ? "Run supabase-system-settings.sql before saving custom system settings." : ""));
    setLoading(false);
  }, []);

  useEffect(() => {
    async function run() {
      const ok = await requireRole(router, "commissioner");

      if (ok) {
        await loadSettings();
      } else {
        setLoading(false);
      }
    }

    run();
  }, [loadSettings, router]);

  function updateSetting(key, value) {
    setSettings((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function resetDefaults() {
    const ok = confirm("Reset Club Setup fields to the Lakewood Ranch Pickleball Club defaults?");
    if (!ok) return;
    setSettings(DEFAULT_SYSTEM_SETTINGS);
  }

  async function saveSettings() {
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;

    if (!accessToken) {
      alert("Your session expired. Please log in again before saving system settings.");
      return;
    }

    setSaving(true);
    const response = await fetch("/api/system-settings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ settings }),
    });
    const result = await response.json().catch(() => ({}));
    setSaving(false);

    if (!response.ok || !result.success) {
      alert(result.error || "Unable to save system settings.");
      return;
    }

    setSavedSettings(settings);
    cacheSystemSettings(settings);
    document.title = browserTabTitle(settings);
    setSchemaWarning("");
    alert("System setup saved.");
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-100 p-6">
        <div className="mx-auto max-w-5xl rounded-2xl bg-white p-6 shadow">
          Loading system setup...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-6">
      <div className="mx-auto max-w-6xl">
        <AppHeader
          title="Club Setup"
          subtitle="Configure club branding, contact details, and deployment-level defaults."
        />

        {schemaWarning && (
          <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-950">
            {schemaWarning}
          </div>
        )}

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="rounded-2xl bg-white p-4 shadow md:p-6">
            <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-xl font-black text-slate-950">Club Defaults</h2>
                <p className="mt-1 text-sm font-semibold text-slate-600">
                  These values make a separate club deployment configurable without code changes.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={resetDefaults}
                  disabled={saving}
                  className="rounded-xl bg-slate-200 px-4 py-2 text-sm font-bold text-slate-900 hover:bg-slate-300 disabled:opacity-50"
                >
                  Reset Defaults
                </button>
                <button
                  type="button"
                  onClick={saveSettings}
                  disabled={saving || !dirty}
                  className="rounded-xl bg-green-700 px-4 py-2 text-sm font-bold text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {saving ? "Saving..." : "Save Club Setup"}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {SYSTEM_SETTING_FIELDS.map((field) => (
                <label key={field.key} className="block">
                  <span className="text-sm font-black text-slate-800">{field.label}</span>
                  <input
                    type={field.type}
                    value={settings[field.key] || ""}
                    onChange={(event) => updateSetting(field.key, event.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-900"
                  />
                  <span className="mt-1 block text-xs font-semibold text-slate-500">{field.hint}</span>
                </label>
              ))}
            </div>
          </div>

          <aside className="rounded-2xl bg-white p-4 shadow md:p-6">
            <h2 className="text-lg font-black text-slate-950">Brand Preview</h2>
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-3">
                <Image
                  src={settings.logo_url || DEFAULT_SYSTEM_SETTINGS.logo_url}
                  alt={settings.club_name || "Club logo"}
                  width={64}
                  height={64}
                  className="h-16 w-16 rounded-full bg-white object-contain p-1 shadow"
                  unoptimized
                />
                <div className="min-w-0">
                  <div className="truncate text-base font-black text-slate-950">
                    {settings.club_name}
                  </div>
                  <div className="truncate text-sm font-semibold text-slate-600">
                    {settings.system_name}
                  </div>
                </div>
              </div>

              <div className="mt-4 space-y-2 text-sm font-semibold text-slate-700">
                <PreviewRow label="Email" value={settings.main_email} />
                <PreviewRow label="Support" value={settings.support_email} />
                <PreviewRow label="Website" value={settings.club_website} />
                <PreviewRow label="Browser Tab" value={browserTabTitle(settings)} />
                <PreviewRow label="Timezone" value={settings.timezone} />
              </div>
            </div>

            <div className="mt-4 rounded-2xl bg-blue-50 p-4 text-sm font-semibold text-blue-950">
              For future clubs, use a separate Vercel project, GitHub repo/branch, and Supabase project. This page then becomes the post-deploy branding and contact checklist.
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}

function PreviewRow({ label, value }) {
  return (
    <div className="flex min-w-0 justify-between gap-3">
      <span className="text-slate-500">{label}</span>
      <span className="truncate text-right text-slate-950">{value || "-"}</span>
    </div>
  );
}
