"use client";

import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { DEFAULT_SYSTEM_SETTINGS, mergeSystemSettings } from "../../../lib/systemSettings";
import {
  bracketByDivision,
  bracketSingleGameScore,
  bracketStatusLabel,
  courtName,
  isEliminationTournament,
  isRoundRobinTop4Tournament,
  loadPublicTournament,
  scoreDisplay,
  standingsByDivision,
  tournamentDivisionColors,
  tournamentFormatLabel,
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
  const bracketDivisions = useMemo(
    () => bracketByDivision(state?.matches || [], state?.teams || [], state?.divisions || [], state?.tournament?.settings || {}),
    [state]
  );
  const playingMatchesByCourtId = useMemo(() => {
    return Object.fromEntries(
      (state?.matches || [])
        .filter((match) => match.status === "playing" && match.court_id)
        .map((match) => [String(match.court_id), match])
    );
  }, [state]);
  const queueStatus = useMemo(
    () => tournamentDisplayQueueStatus(state?.matches || []),
    [state]
  );
  const queueInsights = useMemo(
    () => tournamentDisplayQueueInsights(state?.matches || [], state?.courts || []),
    [state]
  );

  if (loading) return <PublicShell title="Loading Tournament..." />;
  if (error) return <PublicShell title="Tournament Display" error={error} />;
  if (!state) return <PublicShell title="Tournament Display" error="Tournament not found." />;

  const tournamentKey = state.tournament.slug || state.tournament.id;
  const isTop4 = isRoundRobinTop4Tournament(state.tournament.settings);

  const displayControls = (
    <TournamentDisplayControls
      view={view}
      rotating={rotating}
      setView={setView}
      setRotating={setRotating}
      tournamentKey={tournamentKey}
    />
  );

  return (
    <PublicShell
      title={tournamentDisplayName(state.tournament)}
      adminHref={`/tourney/${tournamentKey}/admin`}
      systemSettings={systemSettings}
      headerActions={displayControls}
    >
      {view === "standings" ? (
        isEliminationTournament(state.tournament.settings) ? (
          <DisplayBracket bracketDivisions={bracketDivisions} settings={state.tournament.settings} />
        ) : (
          <div className="space-y-5">
            <StandingsGrid
              standings={standings}
              matches={state.matches}
              onSelectTeam={(team) => setSelectedStandingTeam(team)}
            />
            {isTop4 && bracketDivisions.length > 0 && (
              <DisplayBracket bracketDivisions={bracketDivisions} settings={state.tournament.settings} />
            )}
          </div>
        )
      ) : (
        <>
          <TournamentDisplayQueueSummary queueStatus={queueStatus} insights={queueInsights} />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {state.courts.map((court) => {
              const match = playingMatchesByCourtId[String(court.id)];
              const colors = match ? tournamentDivisionColors(match.division?.name) : null;

              return (
                <div key={court.id} className={`rounded-2xl border-l-8 p-4 shadow sm:p-5 ${match ? `${colors.border} bg-white` : "border-l-slate-400 bg-slate-50"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs font-black uppercase tracking-wide text-slate-500">Court</div>
                      <div className="text-5xl font-black leading-none text-slate-950 sm:text-6xl md:text-7xl">{courtName(court)}</div>
                    </div>
                    {match && (
                      <div className="flex max-w-[62%] flex-wrap justify-end gap-2 text-[11px] font-black uppercase tracking-wide sm:text-xs">
                        <span className={`inline-flex items-center rounded-lg border border-white/90 px-3 py-1.5 shadow-sm ring-1 ring-slate-900/10 ${colors.publicBadge}`}>
                          {match.division?.name || "Division"}
                        </span>
                        <span className="inline-flex items-center rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-white shadow-sm ring-1 ring-white/40">
                          {matchLineLabel(match)}
                        </span>
                      </div>
                    )}
                  </div>
                  {match ? (
                    <>
                      <h2 className="mt-2 text-xl font-black leading-tight text-slate-950 sm:text-2xl">
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
        </>
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

function TournamentDisplayControls({ view, rotating, setView, setRotating, tournamentKey }) {
  const controlClass = "rounded-xl px-2 py-2 text-center text-xs font-black sm:px-4 sm:text-sm";

  return (
    <div className="grid w-full gap-2 sm:min-w-[520px] sm:max-w-[680px]">
      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => setView("courtsDetail")}
          className={`${controlClass} ${view === "courtsDetail" ? "bg-blue-700 text-white" : "bg-white text-slate-800"}`}
        >
          Court Detail
        </button>
        <button
          type="button"
          onClick={() => setView("courtsSimple")}
          className={`${controlClass} ${view === "courtsSimple" ? "bg-blue-700 text-white" : "bg-white text-slate-800"}`}
        >
          Courts Only
        </button>
        <button
          type="button"
          onClick={() => setView("standings")}
          className={`${controlClass} ${view === "standings" ? "bg-blue-700 text-white" : "bg-white text-slate-800"}`}
        >
          Current Standings
        </button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => setRotating((value) => !value)}
          className={`${controlClass} ${rotating ? "bg-rose-600 text-white" : "bg-emerald-500 text-white"}`}
        >
          {rotating ? "Stop Rotations" : "Start Rotations"}
        </button>
        <Link className={`${controlClass} bg-amber-400 text-slate-950 hover:bg-amber-300`} href={`/tourney/${tournamentKey}/player`}>
          Player View
        </Link>
        <Link className={`${controlClass} bg-amber-400 text-slate-950 hover:bg-amber-300`} href={`/tourney/${tournamentKey}/admin`}>
          Main System
        </Link>
      </div>
    </div>
  );
}

function TournamentDisplayQueueSummary({ queueStatus, insights }) {
  return (
    <div className="mb-3 overflow-x-auto rounded-2xl border border-white/10 bg-slate-900/90 p-3 shadow">
      <div className="flex min-w-[760px] items-center gap-4">
        <div className="shrink-0 rounded-full bg-amber-400/25 px-4 py-2 text-sm font-black text-amber-100">
          Estimated Finish: {insights.finishTime} | Avg Game Length: {formatDurationMinutes(insights.averageMatchMinutes)}
        </div>
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="shrink-0 text-sm font-black text-blue-100">
            Tournament Completion: {queueStatus.completionPercent}%
          </div>
          <div className="h-5 min-w-0 flex-1 overflow-hidden rounded-full border border-blue-300/20 bg-slate-950">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500"
              style={{ width: `${queueStatus.completionPercent}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function PublicShell({ title, error = "", children, adminHref = "", systemSettings = DEFAULT_SYSTEM_SETTINGS, headerActions = null }) {
  const logoUrl = systemSettings.logo_url || DEFAULT_SYSTEM_SETTINGS.logo_url;
  const clubName = systemSettings.club_name || DEFAULT_SYSTEM_SETTINGS.club_name;

  return (
    <main className="full-screen-main show-system-footer min-h-screen bg-slate-950 p-2 text-white sm:p-3">
      <div className="w-full">
        <div className="sticky top-0 z-40 mb-4 rounded-2xl border border-white/10 bg-slate-950/95 p-3 shadow-xl backdrop-blur sm:p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex min-w-0 items-center gap-3 sm:gap-4">
              <Image
                src={logoUrl}
                alt={`${clubName} logo`}
                width={56}
                height={56}
                unoptimized
                className="size-14 shrink-0 rounded-full bg-white object-contain p-1"
              />
              <div className="min-w-0">
                <div className="text-xs font-black uppercase tracking-wide text-blue-200">Tournament Display</div>
                <h1 className="mt-1 break-words text-2xl font-black leading-tight sm:text-3xl md:text-4xl">{title}</h1>
              </div>
            </div>
            {(headerActions || adminHref) && (
              <div className="w-full lg:w-auto">
                {headerActions}
                {!headerActions && adminHref && (
                  <Link href={adminHref} className="rounded-xl bg-amber-400 px-4 py-3 text-center text-sm font-black text-slate-950 hover:bg-amber-300 sm:py-2">
                    Main System
                  </Link>
                )}
              </div>
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

function matchLineLabel(match) {
  return match.legacy_id?.startsWith("BR|") ? "Bracket" : `Line ${match.line_number || 1}`;
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

function DisplayBracket({ bracketDivisions, settings }) {
  if (bracketDivisions.length === 0) {
    return <div className="rounded-2xl bg-white p-8 text-center font-bold text-slate-500">Bracket has not been generated yet.</div>;
  }

  return (
    <section className="space-y-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-3xl font-black leading-tight text-white">{tournamentFormatLabel(settings)} Bracket</h2>
        <span className="rounded-full bg-amber-400/25 px-4 py-2 text-sm font-black text-amber-100">{bracketDivisions.length} Active Divisions</span>
      </div>
      {bracketDivisions.map((divisionGroup) => {
        const colors = tournamentDivisionColors(divisionGroup.division.name);

        return (
          <details key={divisionGroup.division.id} className={`rounded-2xl border p-4 shadow-xl ${colors.standingsPanel}`}>
            <summary className="cursor-pointer list-none">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-2xl font-black text-white">{divisionGroup.division.name}</h3>
                  <p className="mt-1 text-sm font-semibold text-blue-100">Open to view this division bracket.</p>
                </div>
              {divisionGroup.champion && (
                <span className="rounded-full bg-amber-400 px-4 py-2 text-sm font-black text-slate-950">Champion: {divisionGroup.champion.name}</span>
              )}
              {!divisionGroup.champion && <span className="rounded-full bg-white/10 px-4 py-2 text-sm font-black text-blue-100">Collapsed</span>}
              </div>
            </summary>
            <div className="mt-4 flex min-w-max gap-10 overflow-x-auto pb-4">
              {divisionGroup.sections.flatMap((section) =>
                section.rounds.map((round, roundIndex) => (
                  <div key={`${section.key}-${round.key}`} className="w-72 shrink-0">
                    <div className={`rounded-full px-3 py-2 text-center text-xs font-black ${colors.badge}`}>
                      {section.title === "Bracket" ? round.title : `${section.title}: ${round.title}`}
                    </div>
                    <div className="mt-5 space-y-6">
                      {round.matches.map((match, matchIndex) => (
                        <DisplayBracketMatch
                          key={match.id}
                          match={match}
                          isLastRound={roundIndex === section.rounds.length - 1}
                          offsetLevel={roundIndex}
                          matchIndex={matchIndex}
                        />
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </details>
        );
      })}
    </section>
  );
}

function DisplayBracketMatch({ match, offsetLevel, matchIndex }) {
  const score = scoreDisplay(match);
  const statusLabel = bracketStatusLabel(match);
  const homeScore = bracketSingleGameScore(match, "home");
  const awayScore = bracketSingleGameScore(match, "away");
  const showScoreFooter = statusLabel !== "bye" && score && homeScore === "" && awayScore === "";
  const topOffset = matchIndex === 0 ? 0 : Math.min(72, Number(offsetLevel || 0) * 18);

  return (
    <div className="relative" style={{ marginTop: `${topOffset}px` }}>
      <div className="relative rounded-sm border border-white/70 bg-slate-950/60 p-3 shadow-lg">
        <div className="absolute -left-3 -top-3 flex size-8 items-center justify-center rounded-full border border-white/70 bg-slate-950 text-xs font-black text-white shadow">
          #{match.bracketMatchNumber || match.bracketMeta?.match || ""}
        </div>
        <div className="mb-2 flex items-center justify-end gap-2 text-xs font-black uppercase text-blue-200">
          <span>{statusLabel}</span>
        </div>
        <DisplayBracketTeam
          name={match.home_team?.name || "TBD"}
          sourceLabel={match.homeSourceLabel}
          score={homeScore}
          eliminated={Boolean(match.homeEliminated)}
          winner={String(match.winner_team_id || "") === String(match.home_team_id || "")}
        />
        <DisplayBracketTeam
          name={match.away_team?.name || "TBD"}
          sourceLabel={match.awaySourceLabel}
          score={awayScore}
          eliminated={Boolean(match.awayEliminated)}
          winner={String(match.winner_team_id || "") === String(match.away_team_id || "")}
        />
        {showScoreFooter && <div className="mt-2 rounded-sm bg-white/10 px-3 py-2 text-xs font-black text-blue-100">{score}</div>}
      </div>
    </div>
  );
}

function DisplayBracketTeam({ name, sourceLabel = "", score = "", winner, eliminated = false }) {
  return (
    <div className={`mt-1 flex min-h-11 items-center justify-between rounded-sm border px-3 py-2 text-sm font-black ${
      winner ? "border-emerald-300/70 bg-emerald-500/20 text-emerald-100" : "border-white/45 bg-white/10 text-white"
    }`}>
      <span className="min-w-0 flex-1 break-words pr-3">{sourceLabel ? `(${sourceLabel}) ` : ""}{name}</span>
      <span className="ml-2 flex w-16 shrink-0 items-center justify-end gap-1">
        {winner && <span className="rounded-full bg-emerald-400 px-2 py-1 text-[11px] font-black text-slate-950">W</span>}
        {eliminated && <span className="rounded-full bg-rose-500 px-2 py-1 text-[11px] font-black text-white">D</span>}
        {score !== "" && <span className="min-w-8 rounded-full bg-white/15 px-2 py-1 text-center text-xs text-white">{score}</span>}
      </span>
    </div>
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

function tournamentDisplayQueueStatus(matches) {
  const total = (matches || []).length;
  const completed = (matches || []).filter((match) => match.status === "done").length;

  return {
    total,
    completed,
    remaining: Math.max(0, total - completed),
    completionPercent: total > 0 ? Math.round((completed / total) * 100) : 0,
  };
}

function tournamentDisplayQueueInsights(matches, courts) {
  const averageMatchMinutes = averageCompletedMatchMinutes(matches);
  const remaining = (matches || []).filter((match) => match.status !== "done").length;
  const courtCount = Math.max(1, (courts || []).length);
  const wavesRemaining = Math.max(1, Math.ceil(remaining / courtCount));
  const finishDate = new Date(Date.now() + wavesRemaining * averageMatchMinutes * 60000);

  return {
    averageMatchMinutes,
    finishTime: finishDate.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
  };
}

function averageCompletedMatchMinutes(matches) {
  const durations = (matches || [])
    .filter((match) => match.status === "done" && match.assigned_at && match.completed_at)
    .map((match) => {
      const minutes = Math.round((new Date(match.completed_at).getTime() - new Date(match.assigned_at).getTime()) / 60000);
      return minutes >= 5 && minutes <= 180 ? minutes : null;
    })
    .filter((minutes) => minutes !== null);

  return durations.length > 0
    ? Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length)
    : 25;
}

function formatDurationMinutes(value) {
  const totalMinutes = Number(value);
  if (!Number.isFinite(totalMinutes) || totalMinutes < 0) return "0 min";
  const roundedMinutes = Math.round(totalMinutes);
  const hours = Math.floor(roundedMinutes / 60);
  const minutes = roundedMinutes % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes} min`;
}

function completedMatchCounts(matches) {
  return (matches || []).reduce((counts, match) => {
    if (match.status !== "done" || match.result_type === "not_played") return counts;
    if (String(match.legacy_id || "").startsWith("BR|")) return counts;
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
