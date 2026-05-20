"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppHeader from "./components/AppHeader";
import { requireRole } from "./lib/auth";

export default function DashboardPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function run() {
      const user = await requireRole(router, "league_manager");
      if (user) setReady(true);
    }

    run();
  }, [router]);

  if (!ready) {
    return (
      <main className="min-h-screen bg-slate-100 p-6">
        <div className="mx-auto max-w-7xl rounded-2xl bg-white p-6 shadow">
          Loading dashboard...
        </div>
      </main>
    );
  }

  const cards = [
    { title: "Members", desc: "Search and review member records", path: "/members" },
    { title: "Season Ratings", desc: "Update DUPR and PrimeTime ratings", path: "/ratings" },
    { title: "Leagues", desc: "Manage seasons and leagues", path: "/leagues" },
    { title: "Divisions", desc: "Manage division rules and line formats", path: "/divisions" },
    { title: "Locations", desc: "Manage clubs, courts, and location cleanup", path: "/locations" },
    { title: "Teams & Rosters", desc: "Create teams and manage rosters", path: "/teams" },
    { title: "Matches", desc: "Schedule matches and manage match operations", path: "/matches" },
    { title: "Scheduling Admin", desc: "Rules, availability, draft schedules", path: "/scheduling" },
    { title: "Schedule Editor", desc: "Review, edit, and publish schedules", path: "/schedule-editor" },
    { title: "User Roles", desc: "Manage access permissions", path: "/users" }
  ];

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-7xl">
        <AppHeader
  title="LWR PC League Management System"
  subtitle="League Operations Dashboard"
        />

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
          {cards.map(card => (
            <button
              key={card.path}
              onClick={() => router.push(card.path)}
              className="rounded-2xl bg-white p-6 text-left shadow hover:bg-blue-50 hover:shadow-md"
            >
              <div className="text-xl font-bold text-slate-900">
                {card.title}
              </div>

              <div className="mt-2 text-sm text-slate-600">
                {card.desc}
              </div>
            </button>
          ))}
        </div>

        <div className="mt-8 rounded-2xl bg-white p-6 shadow">
          <h2 className="text-2xl font-bold text-slate-900">
            Current Build Status
          </h2>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
            <Status label="Membership Import" value="Working" />
            <Status label="Teams / Rosters" value="Working" />
            <Status label="Scheduling / Scores" value="In Progress" />
          </div>
        </div>
      </div>
    </main>
  );
}

function Status({ label, value }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <div className="text-sm font-semibold text-slate-500">
        {label}
      </div>

      <div className="mt-1 text-lg font-bold text-slate-900">
        {value}
      </div>
    </div>
  );
}
