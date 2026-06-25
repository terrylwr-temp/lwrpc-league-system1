"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AppHeader from "../components/AppHeader";
import PbccFooter from "../components/PbccFooter";
import { loadPublicRoundRobinGroups, roundRobinModeLabel, roundRobinPath } from "../lib/roundRobins";

export default function RoundRobinGroupsPage() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadPublicRoundRobinGroups()
      .then(setGroups)
      .catch((loadError) => setError(loadError.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="full-screen-main flex min-h-screen flex-col bg-[linear-gradient(135deg,#e8f7f1_0%,#f7fbff_48%,#fff7e8_100%)] p-4 text-slate-950 sm:p-6">
      <div className="w-full flex-1">
        <AppHeader
          title="PBCourtCommand"
          subtitle="Nightly round robin groups, ladder sessions, lineups, scores, and results."
        />

        <div className="mt-5 rounded-lg border border-white/80 bg-white/95 p-5 shadow-[0_24px_70px_-44px_rgba(15,23,42,0.75)]">
          {loading && <div className="text-sm font-semibold text-slate-500">Loading round robin groups...</div>}
          {error && <div className="rounded-lg bg-red-50 p-4 font-semibold text-red-800">{error}</div>}

          {!loading && !error && groups.length === 0 && (
            <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center font-semibold text-slate-500">
              No public round robin groups are available yet.
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {groups.map((group) => {
              const key = group.slug || group.id;

              return (
                <div key={group.id} className="overflow-hidden rounded-lg border border-slate-900/10 bg-white shadow-[0_18px_44px_-34px_rgba(15,23,42,0.75)]">
                  <div className="h-2 bg-[linear-gradient(90deg,#0f766e,#2563eb,#f59e0b)]" />
                  <div className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-black text-slate-950">{group.name}</h2>
                      <div className="mt-1 text-sm font-semibold text-slate-500">
                        {roundRobinModeLabel(group.mode)}
                        {group.schedule_day ? ` - ${group.schedule_day}` : ""}
                        {group.schedule_time ? ` at ${formatTime(group.schedule_time)}` : ""}
                      </div>
                    </div>
                    <span className="rounded-lg bg-teal-50 px-3 py-1 text-xs font-black uppercase tracking-wide text-teal-800 shadow-sm">
                      RR
                    </span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link className="rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-sm font-bold text-white shadow-[0_10px_24px_-16px_rgba(15,23,42,0.9)] ring-1 ring-white transition hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-lg" href={roundRobinPath(key)}>
                      Open
                    </Link>
                    <Link className="rounded-lg border border-teal-800 bg-teal-700 px-4 py-2 text-sm font-bold text-white shadow-[0_10px_24px_-16px_rgba(15,118,110,0.8)] ring-1 ring-white transition hover:-translate-y-0.5 hover:bg-teal-800 hover:shadow-lg" href={roundRobinPath(key, "admin")}>
                      Admin Setup
                    </Link>
                  </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <PbccFooter />
    </main>
  );
}

function formatTime(value) {
  if (!value) return "";
  const [hourText, minuteText] = String(value).split(":");
  const hour = Number(hourText || 0);
  const minute = Number(minuteText || 0);
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}
