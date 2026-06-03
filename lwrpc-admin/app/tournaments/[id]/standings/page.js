"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { loadPublicTournament, standingsByDivision, tournamentDisplayName, tournamentStandingLabel } from "../../../lib/tournaments";

export default function TournamentStandingsPage() {
  const { id } = useParams();
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadPublicTournament(id)
      .then(setState)
      .catch((loadError) => setError(loadError.message))
      .finally(() => setLoading(false));
  }, [id]);

  const standings = useMemo(
    () => standingsByDivision(state?.matches || [], state?.teams || [], state?.divisions || [], state?.tournament?.settings || {}),
    [state]
  );

  if (loading) return <Shell title="Loading Standings..." />;
  if (error) return <Shell title="Tournament Standings" error={error} />;
  if (!state) return <Shell title="Tournament Standings" error="Tournament not found." />;

  const tournamentKey = state.tournament.slug || state.tournament.id;

  return (
    <Shell title={`${tournamentDisplayName(state.tournament)} Standings`}>
      <div className="sticky top-0 z-30 mb-4 grid grid-cols-2 gap-2 rounded-2xl border border-slate-200 bg-slate-100/95 p-2 shadow-lg backdrop-blur sm:flex sm:flex-wrap">
        <Link className="rounded-xl bg-blue-700 px-4 py-3 text-center text-sm font-bold text-white sm:py-2" href={`/tourney/${tournamentKey}/display`}>
          Display
        </Link>
        <Link className="rounded-xl bg-amber-400 px-4 py-3 text-center text-sm font-bold text-slate-950 sm:py-2" href={`/tourney/${tournamentKey}/player`}>
          Player View
        </Link>
      </div>

      {Object.entries(standings).length === 0 ? (
        <div className="rounded-2xl bg-white p-8 text-center font-bold text-slate-500 shadow">No completed scores yet.</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {Object.entries(standings).map(([division, rows]) => (
            <div key={division} className="rounded-2xl bg-white p-5 shadow">
              <h2 className="text-2xl font-black text-slate-950">{division}</h2>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="py-2">Rank</th>
                      <th>Team</th>
                      <th>W</th>
                      <th>L</th>
                      <th>PF</th>
                      <th>PA</th>
                      <th>Diff</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, index) => (
                      <tr key={row.team} className="border-t border-slate-100">
                        <td className="py-3 font-black">{index + 1}</td>
                        <td className="font-bold">{tournamentStandingLabel(row)}</td>
                        <td>{row.w}</td>
                        <td>{row.l}</td>
                        <td>{row.pf}</td>
                        <td>{row.pa}</td>
                        <td>{row.pf - row.pa}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </Shell>
  );
}

function Shell({ title, error = "", children }) {
  return (
    <main className="full-screen-main min-h-screen bg-slate-100 p-3 sm:p-6">
      <div className="mx-auto w-full max-w-[1600px]">
        <div className="mb-5 rounded-2xl bg-slate-900 p-4 text-white shadow sm:p-5">
          <div className="text-xs font-black uppercase tracking-wide text-blue-200">Current Standings</div>
          <h1 className="mt-1 break-words text-2xl font-black leading-tight sm:text-3xl">{title}</h1>
        </div>
        {error ? <div className="rounded-xl bg-red-50 p-4 font-bold text-red-800">{error}</div> : children}
      </div>
    </main>
  );
}
