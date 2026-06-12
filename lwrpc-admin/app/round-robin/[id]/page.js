"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { loadPublicRoundRobin, roundRobinDisplayName, roundRobinModeLabel, roundRobinPath } from "../../lib/roundRobins";

export default function RoundRobinPublicPage() {
  const { id } = useParams();
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadPublicRoundRobin(id)
      .then(setState)
      .catch((loadError) => setError(loadError.message))
      .finally(() => setLoading(false));
  }, [id]);

  const rounds = useMemo(() => groupMatchesByRound(state?.matches || []), [state]);

  if (loading) return <Shell title="Loading PBCourtCommand..." />;
  if (error) return <Shell title="PBCourtCommand" error={error} />;
  if (!state) return <Shell title="PBCourtCommand" error="PBCourtCommand group not found." />;

  const group = state.group;
  const key = group.slug || group.id;
  const latestSession = state.latestSession;
  const title = roundRobinDisplayName(group);

  return (
    <Shell title={title} subtitle={roundRobinModeLabel(group.mode)} playerHref={roundRobinPath(key, "player")} adminHref={roundRobinPath(key, "admin")}>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <section className="space-y-5">
          <div className="overflow-hidden rounded-lg border border-white/80 bg-white/95 shadow-[0_24px_70px_-42px_rgba(15,23,42,0.75)]">
            <div className="h-2 bg-[linear-gradient(90deg,#0f766e,#2563eb,#f59e0b)]" />
            <div className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-xs font-black uppercase tracking-wide text-teal-700">Current Session</div>
                <h2 className="mt-1 text-3xl font-black text-slate-950">
                  {latestSession ? formatDate(latestSession.session_date) : "No active session yet"}
                </h2>
                {latestSession && (
                  <p className="mt-2 text-sm font-semibold text-slate-600">
                    {latestSession.session_name || "Session"} - {latestSession.location || "Location pending"} - {latestSession.status}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {latestSession && (
                  <>
                    <span className="rounded-lg bg-teal-50 px-3 py-2 text-sm font-black text-teal-900">{latestSession.round_count} game{Number(latestSession.round_count) === 1 ? "" : "s"}</span>
                    <span className="rounded-lg bg-blue-50 px-3 py-2 text-sm font-black text-blue-900">{latestSession.court_count} court{Number(latestSession.court_count) === 1 ? "" : "s"}</span>
                  </>
                )}
                <Link className="rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-sm font-black text-white shadow-[0_10px_24px_-16px_rgba(15,23,42,0.9)] ring-1 ring-white transition hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-lg" href="/round-robin">
                All Groups
                </Link>
              </div>
            </div>
            </div>
          </div>

          {!latestSession && (
            <div className="rounded-lg border border-dashed border-slate-300 bg-white/90 p-8 text-center font-semibold text-slate-500 shadow-sm">
              The manager has not generated tonight&apos;s schedule yet.
            </div>
          )}

          {rounds.map((round) => (
            <RoundCard key={round.roundNumber} round={round} />
          ))}
        </section>

        <aside className="space-y-4">
          <div className="sticky top-4 rounded-lg border border-white/80 bg-white/95 p-4 shadow-[0_22px_55px_-40px_rgba(15,23,42,0.8)]">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-black text-slate-950">Results</h2>
              <span className="rounded-lg bg-amber-50 px-2 py-1 text-xs font-black uppercase tracking-wide text-amber-800">Live</span>
            </div>
            {state.results.length === 0 ? (
              <p className="mt-2 text-sm font-semibold text-slate-500">Results will appear after scores are entered.</p>
            ) : (
              <div className="mt-3 overflow-hidden rounded-lg border border-slate-200">
                <table className="w-full text-sm">
                  <thead className="bg-slate-950 text-xs uppercase tracking-wide text-white">
                    <tr>
                      <th className="px-2 py-2 text-left">#</th>
                      <th className="px-2 py-2 text-left">Player</th>
                      <th className="px-2 py-2 text-right">W-L</th>
                      <th className="px-2 py-2 text-right">Diff</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {state.results.map((row) => (
                      <tr key={row.player_id || row.display_name} className={Number(row.rank) === 1 ? "bg-amber-50/70" : "bg-white"}>
                        <td className="px-2 py-2 font-black text-slate-500">{row.rank || ""}</td>
                        <td className="px-2 py-2 font-bold text-slate-950">{row.display_name}</td>
                        <td className="px-2 py-2 text-right font-bold text-slate-700">{row.wins}-{row.losses}</td>
                        <td className="px-2 py-2 text-right font-bold text-slate-700">{row.point_diff > 0 ? `+${row.point_diff}` : row.point_diff}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </aside>
      </div>
    </Shell>
  );
}

function Shell({ title, subtitle, error, playerHref, adminHref, children }) {
  return (
    <main className="full-screen-main min-h-screen bg-[linear-gradient(135deg,#e8f7f1_0%,#f7fbff_46%,#fff7e8_100%)] p-3 text-slate-950 sm:p-6">
      <div className="w-full">
        <header className="mb-5 overflow-hidden rounded-lg border border-teal-900/10 bg-slate-950 text-white shadow-[0_28px_80px_-44px_rgba(15,23,42,0.95)]">
          <div className="h-2 bg-[linear-gradient(90deg,#14b8a6,#38bdf8,#f59e0b)]" />
          <div className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs font-black uppercase tracking-wide text-teal-200">PBCourtCommand</div>
              <h1 className="text-3xl font-black sm:text-4xl">{title}</h1>
              {subtitle && <p className="mt-1 text-sm font-semibold text-slate-300">{subtitle}</p>}
            </div>
            <div className="flex flex-wrap gap-2">
              {playerHref && (
                <Link className="rounded-lg border border-white/40 bg-white px-4 py-2 text-sm font-black text-slate-950 shadow-[0_10px_24px_-14px_rgba(255,255,255,0.9)] ring-1 ring-slate-950/10 transition hover:-translate-y-0.5 hover:bg-slate-100 hover:shadow-lg" href={playerHref}>
                  Join / Decline
                </Link>
              )}
              {adminHref && (
                <Link className="rounded-lg border border-teal-200/60 bg-teal-500 px-4 py-2 text-sm font-black text-white shadow-[0_10px_24px_-14px_rgba(20,184,166,0.9)] ring-1 ring-white/20 transition hover:-translate-y-0.5 hover:bg-teal-400 hover:shadow-lg" href={adminHref}>
                  Admin Setup
                </Link>
              )}
            </div>
          </div>
          </div>
        </header>
        {error ? <div className="rounded-lg bg-red-50 p-4 font-bold text-red-800">{error}</div> : children}
      </div>
    </main>
  );
}

function RoundCard({ round }) {
  const byes = round.matches.flatMap((match) => match.bye_players || []);

  return (
    <section className="rounded-lg border border-white/80 bg-white/95 p-4 shadow-[0_20px_60px_-42px_rgba(15,23,42,0.75)]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-black text-slate-950">Round {round.roundNumber}</h2>
      </div>
      {byes.length > 0 && (
        <div className="mt-2 rounded-lg bg-amber-100 px-3 py-2 text-sm font-black text-amber-900">
          Bye: {byes.map((player) => player.firstLabel || player.displayName).join(", ")}
        </div>
      )}
      <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
        {round.matches.map((match) => (
          <CourtDiagram key={match.id} match={match} />
        ))}
      </div>
    </section>
  );
}

function CourtDiagram({ match }) {
  const complete = match.team1_score !== null && match.team1_score !== undefined && match.team2_score !== null && match.team2_score !== undefined;

  return (
    <div className="overflow-hidden rounded-lg border border-slate-900/10 bg-white shadow-[0_18px_45px_-32px_rgba(15,23,42,0.9)]">
      <div className="flex items-center justify-between bg-[linear-gradient(90deg,#0f3b36,#166b61)] px-3 py-2 text-white">
        <div className="font-black">{match.court_name || `Court ${match.court_number}`}</div>
        {complete && <div className="rounded-md bg-white/15 px-2 py-1 text-sm font-black">{match.team1_score} - {match.team2_score}</div>}
      </div>
      <div className="relative min-h-44 overflow-hidden bg-[#163f38] p-3" style={{ perspective: "900px" }}>
        <div className="absolute inset-4 rounded-lg border border-white/35 bg-[linear-gradient(145deg,#9fe7c5_0%,#54c49a_48%,#20856f_100%)] shadow-[0_24px_42px_-24px_rgba(0,0,0,0.65)]" style={{ transform: "rotateX(8deg)", transformOrigin: "center bottom" }}>
          <div className="absolute inset-3 rounded-md border border-white/60" />
          <div className="absolute bottom-3 top-3 left-1/2 w-px bg-white/65" />
          <div className="absolute left-3 right-3 top-1/2 h-px bg-white/50" />
          <div className="absolute bottom-3 top-3 left-[25%] w-px bg-white/35" />
          <div className="absolute bottom-3 top-3 right-[25%] w-px bg-white/35" />
        </div>
        <div className="relative z-10 grid min-h-40 grid-cols-[1fr_auto_1fr] items-stretch gap-3 p-3">
          <TeamSide players={match.team1_players} align="right" tone="teal" />
          <div className="flex items-center justify-center">
            <div className="h-full w-px rounded-full bg-white/70 shadow-[0_0_16px_rgba(255,255,255,0.65)]" />
          </div>
          <TeamSide players={match.team2_players} tone="blue" />
        </div>
      </div>
    </div>
  );
}

function TeamSide({ players = [], align = "left", tone = "teal" }) {
  const toneClass = tone === "blue" ? "border-blue-200 text-blue-950" : "border-teal-200 text-teal-950";
  return (
    <div className={`flex flex-col justify-center gap-2 ${align === "right" ? "items-end text-right" : "items-start text-left"}`}>
      {players.map((player) => (
        <div key={player.id} className={`w-fit rounded-lg border bg-white/95 px-3 py-2 text-base font-black shadow-[0_12px_22px_-16px_rgba(15,23,42,0.85)] ${toneClass}`}>
          {player.firstLabel || player.displayName}
        </div>
      ))}
    </div>
  );
}

function groupMatchesByRound(matches) {
  const byRound = {};
  matches.forEach((match) => {
    byRound[match.round_number] ||= { roundNumber: match.round_number, matches: [] };
    byRound[match.round_number].matches.push(match);
  });
  return Object.values(byRound).sort((a, b) => a.roundNumber - b.roundNumber);
}

function formatDate(value) {
  if (!value) return "";
  return new Date(`${value}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
