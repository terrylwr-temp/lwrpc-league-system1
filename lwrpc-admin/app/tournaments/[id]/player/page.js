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
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [systemSettings, setSystemSettings] = useState(DEFAULT_SYSTEM_SETTINGS);

  useEffect(() => {
    loadPublicTournament(id)
      .then((nextState) => {
        setState(nextState);
        const requestedTeam = searchParams.get("teamId");
        const requestedPlayer = searchParams.get("player");
        const players = tournamentPlayers(nextState?.teams || [], nextState?.divisions || []);
        const requested = requestedTeam
          ? players.find((player) => String(player.teamId) === String(requestedTeam))
          : players.find((player) => player.name.toLowerCase() === String(requestedPlayer || "").toLowerCase());
        if (requested) setSelectedTeamId(requested.teamId);
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

  const players = useMemo(() => tournamentPlayers(state?.teams || [], state?.divisions || []), [state]);
  const selectedPlayer = players.find((player) => String(player.teamId) === String(selectedTeamId));
  const playerMatches = useMemo(() => matchesForTeam(state?.matches || [], selectedTeamId), [state, selectedTeamId]);
  const playerRecord = useMemo(() => tournamentTeamRecord(playerMatches, selectedTeamId), [playerMatches, selectedTeamId]);
  const playing = playerMatches.find((match) => match.status === "playing");
  const pending = playerMatches.find((match) => match.status === "pending");

  if (loading) return <Shell title="Loading Player View..." />;
  if (error) return <Shell title="Tournament Player View" error={error} />;
  if (!state) return <Shell title="Tournament Player View" error="Tournament not found." />;

  const tournamentKey = state.tournament.slug || state.tournament.id;

  return (
    <Shell title={tournamentDisplayName(state.tournament)} systemSettings={systemSettings}>
      <div className="mb-4 flex flex-wrap gap-2">
        <Link className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-bold text-white" href={`/tourney/${tournamentKey}/display`}>
          Display
        </Link>
        <Link className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white" href={`/tourney/${tournamentKey}/standings`}>
          Standings
        </Link>
      </div>

      <div className="rounded-2xl bg-white p-5 shadow">
        <label className="text-sm font-black uppercase tracking-wide text-slate-500">Select Player</label>
        <select
          value={selectedTeamId}
          onChange={(event) => setSelectedTeamId(event.target.value)}
          className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-semibold"
        >
          <option value="">Choose a player...</option>
          {players.map((player) => (
            <option key={`${player.teamId}-${player.name}`} value={player.teamId}>
              {player.name} - {player.team} ({player.division} Line {player.line})
            </option>
          ))}
        </select>
      </div>

      {selectedPlayer && (
        <div className="mt-4 space-y-4">
          <div className="rounded-2xl bg-white p-5 shadow">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-2xl font-black text-slate-950">{selectedPlayer.name}</h2>
              <span className="rounded-full bg-blue-100 px-4 py-2 text-sm font-black text-blue-900">
                Record: {playerRecord.w}-{playerRecord.l}
              </span>
            </div>
            <div className="mt-2 grid grid-cols-1 gap-2 text-sm font-semibold text-slate-700 md:grid-cols-3">
              <div className="rounded-xl bg-slate-50 px-3 py-2">Team: {selectedPlayer.team}</div>
              <div className="rounded-xl bg-slate-50 px-3 py-2">Division: {selectedPlayer.division}</div>
              <div className="rounded-xl bg-slate-50 px-3 py-2">Line: {selectedPlayer.line}</div>
            </div>
          </div>

          {playing ? (
            <div className="rounded-2xl bg-emerald-600 p-6 text-white shadow">
              <div className="text-sm font-black uppercase tracking-wide text-emerald-100">Playing Now</div>
              <div className="mt-1 text-3xl font-black">Court {playing.court?.name || ""}</div>
              <div className="mt-2 text-xl font-bold">{playing.home_team?.name} vs {playing.away_team?.name}</div>
            </div>
          ) : pending ? (
            <div className="rounded-2xl bg-amber-100 p-5 text-amber-950 shadow">
              <div className="text-sm font-black uppercase tracking-wide">On Deck</div>
              <div className="mt-1 text-xl font-black">{pending.home_team?.name} vs {pending.away_team?.name}</div>
            </div>
          ) : (
            <div className="rounded-2xl bg-white p-5 font-semibold text-slate-500 shadow">No pending matches right now.</div>
          )}

          <div className="rounded-2xl bg-white p-5 shadow">
            <h2 className="text-xl font-black text-slate-950">Matches</h2>
            <div className="mt-3 space-y-2">
              {playerMatches.map((match) => (
                <div key={match.id} className={`rounded-xl border p-3 text-sm font-semibold ${playerMatchOutcomeClass(match, selectedTeamId)}`}>
                  <div className="font-black text-slate-950">{match.home_team?.name} vs {match.away_team?.name}</div>
                  <div className="mt-1 text-slate-600">
                    {displayStatus(match.status)}{match.court?.name ? ` - Court ${match.court.name}` : ""}{playerMatchScoreSummary(match)}
                  </div>
                </div>
              ))}
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

function playerMatchOutcomeClass(match, teamId) {
  if (match.status !== "done" || match.result_type === "not_played") {
    return "border-slate-200 bg-slate-50";
  }

  const winnerId = String(match.winner_team_id || "");
  if (winnerId) {
    return winnerId === String(teamId)
      ? "border-2 border-emerald-800 bg-emerald-200"
      : "border-2 border-rose-800 bg-rose-200";
  }

  const isHome = String(match.home_team_id || "") === String(teamId);
  const teamScore = Number(isHome ? match.home_score : match.away_score);
  const opponentScore = Number(isHome ? match.away_score : match.home_score);
  if (!Number.isFinite(teamScore) || !Number.isFinite(opponentScore) || teamScore === opponentScore) {
    return "border-slate-200 bg-slate-50";
  }

  return teamScore > opponentScore
    ? "border-2 border-emerald-800 bg-emerald-200"
    : "border-2 border-rose-800 bg-rose-200";
}

function Shell({ title, error = "", children, systemSettings = DEFAULT_SYSTEM_SETTINGS }) {
  const logoUrl = systemSettings.logo_url || DEFAULT_SYSTEM_SETTINGS.logo_url;
  const clubName = systemSettings.club_name || DEFAULT_SYSTEM_SETTINGS.club_name;

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-5 rounded-2xl bg-slate-900 p-5 text-white shadow">
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
              <div className="text-xs font-black uppercase tracking-wide text-amber-200">Player View</div>
              <h1 className="mt-1 text-3xl font-black">{title}</h1>
            </div>
          </div>
        </div>
        {error ? <div className="rounded-xl bg-red-50 p-4 font-bold text-red-800">{error}</div> : children}
      </div>
    </main>
  );
}
