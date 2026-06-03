"use client";

import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { DEFAULT_SYSTEM_SETTINGS, mergeSystemSettings } from "../../../lib/systemSettings";
import {
  courtName,
  loadPublicTournament,
  standingsByDivision,
  tournamentDivisionColors,
  tournamentStandingLabel,
  tournamentDisplayName,
} from "../../../lib/tournaments";

const DISPLAY_VIEWS = ["courtsDetail", "courtsSimple", "standings"];

export default function TournamentDisplayPage() {
  const { id } = useParams();
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [view, setView] = useState("courtsDetail");
  const [rotating, setRotating] = useState(true);
  const [selectedStandingTeam, setSelectedStandingTeam] = useState(null);
  const [systemSettings, setSystemSettings] = useState(DEFAULT_SYSTEM_SETTINGS);

  useEffect(() => {
    loadPublicTournament(id)
      .then(setState)
      .catch((loadError) => setError(loadError.message))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    let isMounted = true;

    async function loadSettings() {
      try {
        const response = await fetch("/api/system-settings");
        const result = await response.json().catch(() => ({}));
        if (isMounted && result.success) {
          setSystemSettings(mergeSystemSettings(result.settings));
        }
      } catch {
        if (isMounted) setSystemSettings(DEFAULT_SYSTEM_SETTINGS);
      }
    }

    loadSettings();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!rotating) return undefined;

    const interval = window.setInterval(() => {
      setView((current) => {
        const index = DISPLAY_VIEWS.indexOf(current);
        return DISPLAY_VIEWS[(index + 1) % DISPLAY_VIEWS.length];
      });
    }, 30000);

    return () => window.clearInterval(interval);
  }, [rotating]);

  const standings = useMemo(
    () => standingsByDivision(state?.matches || [], state?.teams || [], state?.divisions || [], state?.tournament?.settings || {}),
    [state]
  );
  const playingMatchesByCourtId = useMemo(() => {
    return Object.fromEntries(
      (state?.matches || [])
        .filter((match) => match.status === "playing" && match.court_id)
        .map((match) => [String(match.court_id), match])
    );
  }, [state]);

  if (loading) return <PublicShell title="Loading Tournament..." />;
  if (error) return <PublicShell title="Tournament Display" error={error} />;
  if (!state) return <PublicShell title="Tournament Display" error="Tournament not found." />;

  const tournamentKey = state.tournament.slug || state.tournament.id;

  return (
    <PublicShell title={tournamentDisplayName(state.tournament)} adminHref={`/tourney/${tournamentKey}/admin`} systemSettings={systemSettings}>
      <div className="mb-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setRotating((value) => !value)}
          className={`rounded-xl px-4 py-2 text-sm font-black ${rotating ? "bg-rose-600 text-white" : "bg-emerald-500 text-white"}`}
        >
          {rotating ? "Stop Rotations" : "Start Rotations"}
        </button>
        <button
          type="button"
          onClick={() => setView("courtsDetail")}
          className={`rounded-xl px-4 py-2 text-sm font-black ${view === "courtsDetail" ? "bg-blue-700 text-white" : "bg-white text-slate-800"}`}
        >
          Court Detail
        </button>
        <button
          type="button"
          onClick={() => setView("courtsSimple")}
          className={`rounded-xl px-4 py-2 text-sm font-black ${view === "courtsSimple" ? "bg-blue-700 text-white" : "bg-white text-slate-800"}`}
        >
          Courts Only
        </button>
        <button
          type="button"
          onClick={() => setView("standings")}
          className={`rounded-xl px-4 py-2 text-sm font-black ${view === "standings" ? "bg-blue-700 text-white" : "bg-white text-slate-800"}`}
        >
          Current Standings
        </button>
        <Link className="rounded-xl bg-amber-400 px-4 py-2 text-sm font-black text-slate-950" href={`/tourney/${tournamentKey}/player`}>
          Player View
        </Link>
      </div>

      {view === "standings" ? (
        <StandingsGrid
          standings={standings}
          matches={state.matches}
          onSelectTeam={(team) => setSelectedStandingTeam(team)}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {state.courts.map((court) => {
            const match = playingMatchesByCourtId[String(court.id)];
            const colors = match ? tournamentDivisionColors(match.division?.name) : null;

            return (
              <div key={court.id} className={`rounded-2xl border-l-8 p-5 shadow ${match ? `${colors.border} bg-white` : "border-l-slate-400 bg-slate-50"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-black uppercase tracking-wide text-slate-500">Court</div>
                    <div className="text-6xl font-black leading-none text-slate-950 md:text-7xl">{courtName(court)}</div>
                  </div>
                  {match && (
                    <div className="flex max-w-[55%] flex-wrap justify-end gap-2 text-xs font-bold uppercase tracking-wide">
                      <span className={`rounded-full px-3 py-1 ${colors.publicBadge}`}>{match.division?.name || "Division"}</span>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">Line {match.line_number || 1}</span>
                    </div>
                  )}
                </div>
                {match ? (
                  <>
                    <h2 className="mt-2 text-2xl font-black text-slate-950">
                      {match.home_team?.name || "Home"} vs {match.away_team?.name || "Away"}
                    </h2>
                    {view === "courtsDetail" && (
                      <div className="mt-4 grid grid-cols-1 gap-2 text-sm font-semibold text-slate-700">
                        <TeamPlayers team={match.home_team} />
                        <TeamPlayers team={match.away_team} />
                      </div>
                    )}
                  </>
                ) : (
                  <div className="mt-8 text-3xl font-black text-emerald-700">Open</div>
                )}
              </div>
            );
          })}
        </div>
      )}
      {selectedStandingTeam && (
        <StandingTeamDetailModal
          team={selectedStandingTeam}
          matches={matchesForStandingTeam(state.matches, selectedStandingTeam)}
          onClose={() => setSelectedStandingTeam(null)}
        />
      )}
    </PublicShell>
  );
}

function PublicShell({ title, error = "", children, adminHref = "", systemSettings = DEFAULT_SYSTEM_SETTINGS }) {
  const logoUrl = systemSettings.logo_url || DEFAULT_SYSTEM_SETTINGS.logo_url;
  const clubName = systemSettings.club_name || DEFAULT_SYSTEM_SETTINGS.club_name;

  return (
    <main className="full-screen-main min-h-screen bg-slate-950 p-2 text-white md:p-3">
      <div className="w-full">
        <div className="mb-5 rounded-2xl border border-white/10 bg-white/10 p-5 shadow">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-center gap-4">
              <Image
                src={logoUrl}
                alt={`${clubName} logo`}
                width={56}
                height={56}
                unoptimized
                className="size-14 shrink-0 rounded-full bg-white object-contain p-1"
              />
              <div>
                <div className="text-xs font-black uppercase tracking-wide text-blue-200">Tournament Display</div>
                <h1 className="mt-1 text-3xl font-black md:text-4xl">{title}</h1>
              </div>
            </div>
            {adminHref && (
              <Link href={adminHref} className="w-fit rounded-xl bg-amber-400 px-4 py-2 text-sm font-black text-slate-950 hover:bg-amber-300">
                Main System
              </Link>
            )}
          </div>
        </div>
        {error ? (
          <div className="rounded-2xl bg-red-50 p-5 font-bold text-red-800">{error}</div>
        ) : children}
      </div>
    </main>
  );
}

function TeamPlayers({ team }) {
  const players = [team?.player_1_name, team?.player_2_name].filter(Boolean);

  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2">
      <div className="font-black text-slate-950">{team?.name || "Team"}</div>
      {players.length > 0 && <div className="text-slate-600">{players.join(" / ")}</div>}
    </div>
  );
}

function StandingsGrid({ standings, matches, onSelectTeam }) {
  const entries = Object.entries(standings);
  const completedMatchesByDivision = completedMatchCounts(matches);

  if (entries.length === 0) {
    return <div className="rounded-2xl bg-white p-8 text-center font-bold text-slate-500">No completed scores yet.</div>;
  }

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-3xl font-black leading-tight text-white">Current Standings</h2>
        <span className="rounded-full bg-amber-400/25 px-4 py-2 text-sm font-black text-amber-100">{entries.length} Active Divisions</span>
      </div>
      <div className="mb-4 rounded-2xl border border-blue-300/20 bg-white/10 px-4 py-3 text-sm font-semibold text-blue-100">
        Standings are ranked by wins, regular season standing, point differential, points for, and team name.
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
        {entries.map(([division, rows]) => {
          const colors = tournamentDivisionColors(division);

          return (
          <div key={division} className={`rounded-2xl border p-4 shadow-xl ${colors.standingsPanel}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h3 className="text-2xl font-black text-white">{division}</h3>
              <span className="rounded-full bg-blue-400/25 px-3 py-1 text-sm font-black text-blue-100">{rows.length} teams</span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 text-sm font-black">
              <span className="rounded-full bg-emerald-400/25 px-3 py-1 text-emerald-100">
                {completedMatchesByDivision[division] || 0} matches completed
              </span>
              <span className="rounded-full bg-blue-400/25 px-3 py-1 text-blue-100">{rows.length} ranked</span>
            </div>

            <div className="mt-4 overflow-hidden rounded-2xl bg-slate-950/30">
              <table className="w-full text-sm text-white">
                <thead className="bg-blue-900/60 text-left text-xs uppercase tracking-wide text-blue-100">
                  <tr>
                    <th className="px-3 py-3">Rank</th>
                    <th className="px-3 py-3">Team</th>
                    <th className="px-3 py-3 text-center">W</th>
                    <th className="px-3 py-3 text-center">L</th>
                    <th className="px-3 py-3 text-center">Diff</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => (
                    <tr key={row.team} className="border-t border-blue-300/10">
                      <td className="px-3 py-3">
                        <span className="inline-flex size-8 items-center justify-center rounded-full bg-amber-400/25 font-black text-amber-100">{index + 1}</span>
                      </td>
                      <td className="px-3 py-3">
                        <button
                          type="button"
                          onClick={() => onSelectTeam({ ...row, division })}
                          className="rounded-xl border border-blue-300/40 bg-blue-900/70 px-4 py-3 text-left font-black text-white hover:bg-blue-800"
                        >
                          {tournamentStandingLabel(row)}
                        </button>
                      </td>
                      <td className="px-3 py-3 text-center font-black">{row.w}</td>
                      <td className="px-3 py-3 text-center font-black">{row.l}</td>
                      <td className="px-3 py-3 text-center font-black">{row.pf - row.pa > 0 ? `+${row.pf - row.pa}` : row.pf - row.pa}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          );
        })}
      </div>
    </section>
  );
}

function StandingTeamDetailModal({ team, matches, onClose }) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 p-4">
      <div className="mx-auto min-h-[70vh] max-w-7xl rounded-2xl border border-blue-300/20 bg-blue-950 p-4 text-white shadow-2xl">
        <div className="rounded-2xl bg-slate-950/55 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-3xl font-black">{team.team}</h2>
              <p className="mt-3 text-sm font-semibold text-blue-200">{team.division} Match Detail</p>
            </div>
            <button type="button" onClick={onClose} className="w-fit rounded-xl border border-blue-300/40 bg-blue-950 px-5 py-3 text-sm font-black text-white hover:bg-blue-900">
              Close
            </button>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto rounded-2xl bg-slate-950/30">
          <table className="min-w-[880px] w-full text-left text-sm">
            <thead className="bg-blue-900/70 text-blue-100">
              <tr>
                <th className="px-3 py-3">Line</th>
                <th className="px-3 py-3">Match</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Result</th>
                <th className="px-3 py-3">Score</th>
                <th className="px-3 py-3">Court</th>
              </tr>
            </thead>
            <tbody>
              {matches.map((match) => (
                <tr key={match.id} className="border-t border-blue-300/10 align-top">
                  <td className="px-3 py-4 font-semibold">Line {match.line_number || 1}</td>
                  <td className="px-3 py-4 font-semibold">{match.home_team?.name || "Home"} vs {match.away_team?.name || "Away"}</td>
                  <td className="px-3 py-4 font-semibold">{match.status}</td>
                  <td className="px-3 py-4 font-semibold">{matchResultText(match)}</td>
                  <td className="px-3 py-4 font-semibold">{scoreText(match)}</td>
                  <td className="px-3 py-4 font-semibold">{match.court?.name || ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {matches.length === 0 && <div className="p-4 text-sm font-semibold text-blue-100">No matches were found for this team.</div>}
        </div>
      </div>
    </div>
  );
}

function matchesForStandingTeam(matches, team) {
  const teamName = team?.team;

  return (matches || [])
    .filter((match) => match.home_team?.name === teamName || match.away_team?.name === teamName)
    .sort((a, b) =>
      Number(a.line_number || 1) - Number(b.line_number || 1) ||
      statusOrder(a.status) - statusOrder(b.status) ||
      Number(a.created_order || 0) - Number(b.created_order || 0)
    );
}

function completedMatchCounts(matches) {
  return (matches || []).reduce((counts, match) => {
    if (match.status !== "done" || match.result_type === "not_played") return counts;
    const division = match.division?.name || "Unassigned";
    counts[division] = (counts[division] || 0) + 1;
    return counts;
  }, {});
}

function matchResultText(match) {
  if (match.status !== "done") return "";
  if (match.result_type === "not_played") return "Not played";
  if (match.winner_team?.name) return `Winner: ${match.winner_team.name}`;
  if (Number(match.home_score || 0) > Number(match.away_score || 0)) return `Winner: ${match.home_team?.name || "Home"}`;
  if (Number(match.away_score || 0) > Number(match.home_score || 0)) return `Winner: ${match.away_team?.name || "Away"}`;
  return "";
}

function scoreText(match) {
  if (Array.isArray(match?.game_scores) && match.game_scores.length > 0) {
    return match.game_scores.map((game, index) => `G${index + 1}: ${game.home}-${game.away}`).join(" | ");
  }

  if (match?.score_text) return match.score_text;
  if (match?.home_score !== null && match?.home_score !== undefined) return `${match.home_score}-${match.away_score ?? 0}`;
  return "";
}

function statusOrder(status) {
  if (status === "playing") return 0;
  if (status === "pending") return 1;
  if (status === "done") return 2;
  return 3;
}
