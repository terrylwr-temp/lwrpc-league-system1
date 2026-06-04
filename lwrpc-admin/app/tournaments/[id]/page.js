"use client";

import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { DEFAULT_SYSTEM_SETTINGS } from "../../lib/systemSettings";
import { loadPublicTournament, tournamentDisplayName, tournamentPlayers } from "../../lib/tournaments";
import { APP_VERSION, COPYRIGHT_YEAR } from "../../lib/version";

export default function TournamentLandingPage() {
  const { id } = useParams();
  const router = useRouter();
  const [state, setState] = useState(null);
  const [selectedPlayer, setSelectedPlayer] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadPublicTournament(id)
      .then(setState)
      .catch((loadError) => setError(loadError.message))
      .finally(() => setLoading(false));
  }, [id]);

  const players = useMemo(() => tournamentPlayers(state?.teams || [], state?.divisions || []), [state]);
  const tournamentKey = state?.tournament?.slug || state?.tournament?.id || id;
  const title = state ? tournamentDisplayName(state.tournament) : "Tournament";

  function openPlayerView() {
    if (!selectedPlayer) return;
    router.push(`/tourney/${tournamentKey}/player?teamId=${encodeURIComponent(selectedPlayer)}`);
  }

  return (
    <main className="full-screen-main flex min-h-screen items-center justify-center bg-slate-950 p-4 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(20,184,166,0.18),transparent_32%),radial-gradient(circle_at_top_right,rgba(37,99,235,0.2),transparent_34%)]" />
      <div className="relative w-full max-w-xl">
        <div className="rounded-2xl border border-white/10 bg-slate-900/90 p-6 text-center shadow-2xl sm:p-8">
          <Image
            src={DEFAULT_SYSTEM_SETTINGS.logo_url}
            alt={DEFAULT_SYSTEM_SETTINGS.club_name}
            width={96}
            height={96}
            className="mx-auto h-24 w-24 rounded-full bg-white object-contain shadow-lg"
            unoptimized
          />

          <h1 className="mt-5 text-3xl font-black leading-tight sm:text-4xl">
            {loading ? "Loading Tournament..." : title}
          </h1>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-300">
            Choose how you want to view the tournament.
          </p>

          {error && (
            <div className="mt-5 rounded-xl border border-red-400/30 bg-red-500/15 p-3 text-sm font-bold text-red-100">
              {error}
            </div>
          )}

          {!error && (
            <div className="mt-6 grid gap-3 text-left">
              <button
                type="button"
                onClick={() => router.push(`/tourney/${tournamentKey}/display`)}
                disabled={loading || !state}
                className="rounded-xl bg-gradient-to-r from-teal-500 to-blue-600 px-5 py-4 text-center text-base font-black text-white shadow-lg hover:from-teal-400 hover:to-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Display All Courts / Current Standings
              </button>

              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <label className="text-xs font-black uppercase tracking-wide text-slate-300">
                  Display By Player
                </label>
                <select
                  value={selectedPlayer}
                  onChange={(event) => setSelectedPlayer(event.target.value)}
                  disabled={loading || players.length === 0}
                  className="mt-2 w-full rounded-xl border border-slate-600 bg-slate-950 px-4 py-3 font-semibold text-white"
                >
                  <option value="">Select player...</option>
                  {players.map((player) => (
                    <option key={`${player.teamId}-${player.name}`} value={player.teamId}>
                      {player.name} - {player.team} ({player.division} Line {player.line})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={openPlayerView}
                  disabled={!selectedPlayer}
                  className="mt-3 w-full rounded-xl bg-amber-400 px-5 py-3 text-center text-sm font-black text-slate-950 hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Open Player View
                </button>
                {players.length === 0 && !loading && (
                  <div className="mt-2 text-xs font-semibold text-slate-400">
                    No tournament players have been added yet.
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => router.push(`/tourney/${tournamentKey}/admin`)}
                disabled={loading || !state}
                className="rounded-xl border border-slate-600 bg-slate-800 px-5 py-4 text-center text-base font-black text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Main System
              </button>
            </div>
          )}

          <div className="mt-6 border-t border-white/10 pt-4 text-center text-xs font-semibold leading-5 text-slate-400">
            {"\u00A9"} {COPYRIGHT_YEAR} {DEFAULT_SYSTEM_SETTINGS.club_name}. All rights reserved.
            <br />
            Version {APP_VERSION}
          </div>
        </div>
      </div>
    </main>
  );
}
