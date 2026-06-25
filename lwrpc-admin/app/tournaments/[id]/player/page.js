"use client";

import Link from "next/link";
import Image from "next/image";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { DEFAULT_SYSTEM_SETTINGS, mergeSystemSettings } from "../../../lib/systemSettings";
import {
  loadPublicTournament,
  matchesForTeam,
  scoreDisplay,
  tournamentDisplayName,
  tournamentPlayers,
} from "../../../lib/tournaments";

export default function TournamentPlayerPage() {
  const { id } = useParams();
  const searchParams = useSearchParams();
  const [state, setState] = useState(null);
  const [selectedPlayerKey, setSelectedPlayerKey] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [systemSettings, setSystemSettings] = useState(DEFAULT_SYSTEM_SETTINGS);
  const [now, setNow] = useState(0);

  useEffect(() => {
    loadPublicTournament(id)
      .then((nextState) => {
        setState(nextState);
        const requestedTeam = searchParams.get("teamId");
        const requestedPlayerKey = searchParams.get("playerKey");
        const requestedPlayer = searchParams.get("player");
        const players = tournamentPlayers(nextState?.teams || [], nextState?.divisions || []);
        const requested = requestedPlayerKey
          ? players.find((player) => player.playerKey === requestedPlayerKey)
          : requestedTeam
          ? players.find((player) => String(player.teamId) === String(requestedTeam))
          : players.find((player) => player.name.toLowerCase() === String(requestedPlayer || "").toLowerCase());
        if (requested) setSelectedPlayerKey(requested.playerKey);
      })
      .catch((loadError) => setError(loadError.message))
      .finally(() => setLoading(false));
  }, [id, searchParams]);

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
    setNow(Date.now());
    const interval = window.setInterval(() => {
      setNow(Date.now());
    }, 30000);

    return () => window.clearInterval(interval);
  }, []);

  const players = useMemo(() => tournamentPlayers(state?.teams || [], state?.divisions || []), [state]);
  const selectedPlayer = players.find((player) => player.playerKey === selectedPlayerKey);
  const selectedTeamId = selectedPlayer?.teamId || "";
  const playerMatches = useMemo(() => sortPlayerViewMatches(matchesForTeam(state?.matches || [], selectedTeamId)), [state, selectedTeamId]);
  const playerRecord = useMemo(() => tournamentTeamRecord(playerMatches, selectedTeamId), [playerMatches, selectedTeamId]);
  const playing = playerMatches.find((match) => match.status === "playing");
  const pending = playerMatches.find((match) => match.status === "pending");

  if (loading) return <Shell title="Loading Player View..." />;
  if (error) return <Shell title="Tournament Player View" error={error} />;
  if (!state) return <Shell title="Tournament Player View" error="Tournament not found." />;

  const tournamentKey = state.tournament.slug || state.tournament.id;

  return (
    <Shell title={tournamentDisplayName(state.tournament)} systemSettings={systemSettings}>
      <div className="sticky top-0 z-30 mb-4 grid grid-cols-2 gap-2 rounded-2xl border border-slate-200 bg-slate-100/95 p-2 shadow-lg backdrop-blur sm:flex sm:flex-wrap">
        <Link className="rounded-xl bg-blue-700 px-4 py-3 text-center text-sm font-bold text-white sm:py-2" href={`/tourney/${tournamentKey}/display`}>
          Display
        </Link>
        <Link className="rounded-xl bg-emerald-700 px-4 py-3 text-center text-sm font-bold text-white sm:py-2" href={`/tourney/${tournamentKey}/standings`}>
          Standings
        </Link>
      </div>

      <div className="rounded-2xl bg-white p-5 shadow">
        <label className="text-sm font-black uppercase tracking-wide text-slate-500">Select Player</label>
        <select
          value={selectedPlayerKey}
          onChange={(event) => setSelectedPlayerKey(event.target.value)}
          className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-semibold"
        >
          <option value="">Choose a player...</option>
          {players.map((player) => (
            <option key={player.playerKey} value={player.playerKey}>
              {player.name} - {player.team} ({player.division} Line {player.line})
            </option>
          ))}
        </select>
      </div>

      {selectedPlayer && (
        <div className="mt-4 space-y-4">
          <div className="overflow-hidden rounded-2xl border border-blue-200 bg-white shadow-lg shadow-blue-950/10 ring-1 ring-blue-100">
            <div className="border-b-4 border-emerald-400 bg-gradient-to-r from-slate-950 via-blue-900 to-emerald-800 p-5 text-white">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs font-black uppercase tracking-wide text-emerald-200">Selected Player</div>
                  <h2 className="mt-1 break-words text-3xl font-black leading-tight">{selectedPlayer.name}</h2>
                </div>
                <span className="rounded-full border border-amber-200 bg-amber-300 px-4 py-2 text-sm font-black text-slate-950 shadow-sm">
                  Record: {playerRecord.w}-{playerRecord.l}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-px bg-blue-100 text-sm font-semibold md:grid-cols-3">
              <div className="bg-blue-50 px-4 py-3">
                <div className="text-[11px] font-black uppercase tracking-wide text-blue-700">Team</div>
                <div className="mt-1 text-base font-black text-blue-950">{selectedPlayer.team}</div>
              </div>
              <div className="bg-emerald-50 px-4 py-3">
                <div className="text-[11px] font-black uppercase tracking-wide text-emerald-700">Division</div>
                <div className="mt-1 text-base font-black text-emerald-950">{selectedPlayer.division}</div>
              </div>
              <div className="bg-amber-50 px-4 py-3">
                <div className="text-[11px] font-black uppercase tracking-wide text-amber-700">Line</div>
                <div className="mt-1 text-base font-black text-amber-950">{selectedPlayer.line}</div>
              </div>
            </div>
          </div>

          {playing ? (
            <div className="rounded-2xl bg-emerald-600 p-6 text-white shadow">
              <div className="text-sm font-black uppercase tracking-wide text-emerald-100">Playing Now</div>
              <div className="mt-1 text-3xl font-black">Court {playing.court?.name || ""}</div>
              <div className="mt-2 text-xl font-bold">{playing.home_team?.name} vs {playing.away_team?.name}</div>
              <div className="mt-4 border-t border-emerald-300/30 pt-3 text-xs font-bold text-emerald-50 sm:text-sm">
                Assigned: {formatTime(playing.assigned_at)} <span className="text-emerald-200">|</span> Game Length: {playTime(playing.assigned_at, now)}
              </div>
            </div>
          ) : pending ? (
            <div className="rounded-2xl bg-amber-100 p-5 text-amber-950 shadow">
              <div className="text-sm font-black uppercase tracking-wide">On Deck - Tentative</div>
              <div className="mt-1 text-xl font-black">{pending.home_team?.name} vs {pending.away_team?.name}</div>
            </div>
          ) : (
            <div className="rounded-2xl bg-white p-5 font-semibold text-slate-500 shadow">No pending matches right now.</div>
          )}

          <div className="rounded-2xl bg-white p-5 shadow">
            <h2 className="text-xl font-black text-slate-950">Matches</h2>
            <div className="mt-3 space-y-2">
              {playerMatches.map((match) => {
                const outcome = playerMatchOutcome(match, selectedTeamId);
                const outcomeTextClass = outcome === "neutral" ? "text-slate-600" : "text-white";

                return (
                  <div key={match.id} className={`rounded-xl border p-3 text-sm font-semibold ${playerMatchOutcomeClass(outcome)}`}>
                    <div className={`font-black ${outcome === "neutral" ? "text-slate-950" : "text-white"}`}>{match.home_team?.name} vs {match.away_team?.name}</div>
                    <div className={`mt-1 ${outcomeTextClass}`}>
                      {displayStatus(match.status)}{match.court?.name ? ` - Court ${match.court.name}` : ""}{playerMatchScoreSummary(match)}
                    </div>
                  </div>
                );
              })}
              {playerMatches.length === 0 && <div className="text-sm font-semibold text-slate-500">No matches found for this player.</div>}
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}

function tournamentTeamRecord(matches, teamId) {
  return (matches || []).reduce((record, match) => {
    if (match.status !== "done" || match.result_type === "not_played") return record;

    const winnerId = String(match.winner_team_id || "");
    if (winnerId) {
      if (winnerId === String(teamId)) record.w += 1;
      else record.l += 1;
      return record;
    }

    const isHome = String(match.home_team_id || "") === String(teamId);
    const teamScore = Number(isHome ? match.home_score : match.away_score);
    const opponentScore = Number(isHome ? match.away_score : match.home_score);
    if (Number.isFinite(teamScore) && Number.isFinite(opponentScore) && teamScore !== opponentScore) {
      if (teamScore > opponentScore) record.w += 1;
      else record.l += 1;
    }

    return record;
  }, { w: 0, l: 0 });
}

function sortPlayerViewMatches(matches = []) {
  return [...matches].sort((a, b) =>
    playerMatchStatusRank(a.status) - playerMatchStatusRank(b.status) ||
    Number(a.created_order || 0) - Number(b.created_order || 0) ||
    String(a.id || "").localeCompare(String(b.id || ""))
  );
}

function playerMatchStatusRank(status) {
  if (status === "playing") return 0;
  if (status === "pending") return 1;
  if (status === "done") return 2;
  return 3;
}

function formatTime(value) {
  if (!value) return "Not assigned";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not assigned";
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" });
}

function playTime(value, now) {
  if (!value || !now) return "0 min";
  const assignedAt = new Date(value).getTime();
  if (Number.isNaN(assignedAt)) return "0 min";

  const elapsedMs = Math.max(0, Number(now) - assignedAt);
  const totalMinutes = Math.floor(elapsedMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes} min`;
}

function displayStatus(status) {
  return String(status || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function playerMatchScoreSummary(match) {
  const score = scoreDisplay(match);
  if (!score) return "";

  const winner = match.winner_team?.name || winnerNameFromScore(match);
  return ` - ${score}${winner ? ` - Winner: ${winner}` : ""}`;
}

function winnerNameFromScore(match) {
  const homeScore = Number(match.home_score);
  const awayScore = Number(match.away_score);
  if (!Number.isFinite(homeScore) || !Number.isFinite(awayScore) || homeScore === awayScore) return "";
  return homeScore > awayScore ? match.home_team?.name || "Home" : match.away_team?.name || "Away";
}

function playerMatchOutcome(match, teamId) {
  if (match.status !== "done" || match.result_type === "not_played") {
    return "neutral";
  }

  const winnerId = String(match.winner_team_id || "");
  if (winnerId) {
    return winnerId === String(teamId) ? "win" : "loss";
  }

  const isHome = String(match.home_team_id || "") === String(teamId);
  const teamScore = Number(isHome ? match.home_score : match.away_score);
  const opponentScore = Number(isHome ? match.away_score : match.home_score);
  if (!Number.isFinite(teamScore) || !Number.isFinite(opponentScore) || teamScore === opponentScore) {
    return "neutral";
  }

  return teamScore > opponentScore ? "win" : "loss";
}

function playerMatchOutcomeClass(outcome) {
  if (outcome === "win") return "border-2 border-green-800 bg-green-700 shadow-sm";
  if (outcome === "loss") return "border-2 border-red-800 bg-red-700 shadow-sm";
  return "border-slate-200 bg-slate-50";
}

function Shell({ title, error = "", children, systemSettings = DEFAULT_SYSTEM_SETTINGS }) {
  const logoUrl = systemSettings.logo_url || DEFAULT_SYSTEM_SETTINGS.logo_url;
  const clubName = systemSettings.club_name || DEFAULT_SYSTEM_SETTINGS.club_name;

  return (
    <main className="full-screen-main show-system-footer min-h-screen bg-slate-100 p-3 sm:p-6">
      <div className="mx-auto w-full max-w-7xl">
        <div className="mb-5 rounded-2xl bg-slate-900 p-4 text-white shadow sm:p-5">
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
              <div className="text-xs font-black uppercase tracking-wide text-amber-200">Player View</div>
              <h1 className="mt-1 break-words text-2xl font-black leading-tight sm:text-3xl">{title}</h1>
            </div>
          </div>
        </div>
        {error ? <div className="rounded-xl bg-red-50 p-4 font-bold text-red-800">{error}</div> : children}
      </div>
    </main>
  );
}
