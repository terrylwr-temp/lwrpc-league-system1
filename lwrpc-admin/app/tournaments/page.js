"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AppHeader from "../components/AppHeader";
import { loadPublicTournaments } from "../lib/tournaments";

export default function TournamentsPage() {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadPublicTournaments()
      .then(setTournaments)
      .catch((loadError) => setError(loadError.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-6xl">
        <AppHeader
          title="Tournaments"
          subtitle="Public tournament displays, standings, and player views."
        />

        <div className="rounded-2xl bg-white p-6 shadow">
          {loading && <div className="text-sm font-semibold text-slate-500">Loading tournaments...</div>}
          {error && <div className="rounded-xl bg-red-50 p-4 font-semibold text-red-800">{error}</div>}

          {!loading && !error && tournaments.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center font-semibold text-slate-500">
              No public tournaments are available yet.
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {tournaments.map((tournament) => {
              const key = tournament.slug || tournament.id;

              return (
                <div key={tournament.id} className="rounded-xl border border-blue-100 bg-blue-50/50 p-4">
                  <h2 className="text-xl font-black text-slate-950">{tournament.name}</h2>
                  <div className="mt-1 text-sm font-semibold text-slate-500">
                    Updated {tournament.updated_at ? new Date(tournament.updated_at).toLocaleString() : "recently"}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800" href={`/tourney/${key}`}>
                      Open
                    </Link>
                    <Link className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800" href={`/tourney/${key}/display`}>
                      Display
                    </Link>
                    <Link className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-800" href={`/tourney/${key}/standings`}>
                      Standings
                    </Link>
                    <Link className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-amber-600" href={`/tourney/${key}/player`}>
                      Player View
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}
