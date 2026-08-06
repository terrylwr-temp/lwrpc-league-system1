"use client";

import { useMemo } from "react";
import PlayerHistoryPanel from "./PlayerHistoryPanel";
import {
  filterHistoryRows,
  historyFilterOptions,
  historyTeamOptionLabel,
  playerLineDetails,
  rowCountsForIndividualWinLoss,
  specialGameStatus,
} from "../lib/playHistory";
import { isSpecialMatchResult } from "../lib/specialMatchResults";

export default function DashboardPlayHistoryModal({
  memberId,
  historyRows,
  playerTeams,
  historyFilter,
  onChangeHistoryFilter,
  onClose,
  onOpenPlayerDetails,
}) {
  const options = useMemo(
    () => historyFilterOptions(historyRows, playerTeams, memberId),
    [historyRows, memberId, playerTeams]
  );
  const filteredRows = useMemo(
    () => filterHistoryRows(historyRows, historyFilter, memberId, playerTeams),
    [historyFilter, historyRows, memberId, playerTeams]
  );
  const stats = useMemo(
    () => filteredRows.reduce((current, row) => {
      const details = playerLineDetails(row, memberId);
      current.games += 1;

      if (historyScoresNeedPosting(row)) {
        current.pendingScores += 1;
      } else if (rowCountsForIndividualWinLoss(row) && details.result === "W") {
        current.wins += 1;
      } else if (rowCountsForIndividualWinLoss(row) && details.result === "L") {
        current.losses += 1;
      }

      return current;
    }, { games: 0, wins: 0, losses: 0, pendingScores: 0 }),
    [filteredRows, memberId]
  );

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/75 p-2 sm:p-4" role="dialog" aria-modal="true" aria-labelledby="member-play-history-title">
      <div className="flex max-h-[94dvh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex flex-col gap-4 bg-gradient-to-r from-blue-700 to-indigo-700 p-5 text-white md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-xs font-black uppercase tracking-wide text-blue-100">Match Results</div>
            <h2 id="member-play-history-title" className="mt-1 text-2xl font-black">My Play History</h2>
          </div>

          <div className="flex w-full flex-col gap-3 md:w-auto md:flex-row md:items-end">
            <label className="w-full md:w-96">
              <span className="mb-1 block text-xs font-black uppercase tracking-wide text-blue-100">Play History Scope</span>
              <select
                value={historyFilter}
                onChange={(event) => onChangeHistoryFilter(event.target.value)}
                className="w-full rounded-xl border border-white/40 bg-white px-4 py-2.5 text-sm font-bold text-slate-950 shadow-sm"
                aria-label="Filter play history by dashboard scope"
              >
                <option value="all">All Seasons/All Teams</option>
                {options.seasons.length > 0 && <optgroup label="Seasons">{options.seasons.map((season) => <option key={season.id} value={`season:${season.id}`}>{season.name}</option>)}</optgroup>}
                {options.leagues.length > 0 && <optgroup label="Leagues">{options.leagues.map((league) => <option key={league.id} value={`league:${league.id}`}>{league.name}{league.seasonName ? ` / ${league.seasonName}` : ""}</option>)}</optgroup>}
                {options.divisions.length > 0 && <optgroup label="Divisions">{options.divisions.map((division) => <option key={division.id} value={`division:${division.id}`}>{division.name}{division.leagueName ? ` / ${division.leagueName}` : ""}</option>)}</optgroup>}
                {options.teams.length > 0 && <optgroup label="Teams">{options.teams.map((team) => <option key={team.id} value={`team:${team.id}`}>{historyTeamOptionLabel(team)}</option>)}</optgroup>}
              </select>
            </label>

            <div className="flex w-full gap-3 md:w-auto">
              <button type="button" onClick={onOpenPlayerDetails} className="flex-1 rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-black text-white hover:bg-white/20 md:flex-none">More Player Details</button>
              <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-black text-white hover:bg-white/20 md:flex-none">Close</button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 md:grid-cols-4 md:gap-3 md:p-5">
          <HistoryStat label="Games Played" value={stats.games} tone="slate" />
          <HistoryStat label="Wins" value={stats.wins} tone="emerald" />
          <HistoryStat label="Losses" value={stats.losses} tone="red" />
          <HistoryStat label="Scores Pending" value={stats.pendingScores} tone="amber" />
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-5">
          <PlayerHistoryPanel
            memberId={memberId}
            historyRows={historyRows}
            playerTeams={playerTeams}
            selectedFilter={historyFilter}
            onFilterChange={onChangeHistoryFilter}
            onClose={onClose}
            className="mt-0 border-0 bg-transparent p-0"
            closeOnPanelClick={false}
            showHeader={false}
            emptyMessage="No game play history found."
            emptyClassName="rounded-xl bg-slate-50 p-6 text-center text-slate-500"
          />
        </div>
      </div>
    </div>
  );
}

function HistoryStat({ label, value, tone = "slate" }) {
  const tones = {
    slate: "bg-slate-950 text-white",
    emerald: "bg-emerald-600 text-white",
    red: "bg-rose-600 text-white",
    amber: "bg-amber-400 text-slate-950",
  };
  const labelClass = tone === "amber" ? "text-slate-800" : "text-white/75";

  return (
    <div className={`rounded-xl p-2.5 shadow-sm sm:p-4 ${tones[tone] || tones.slate}`}>
      <div className={`text-[10px] font-bold uppercase leading-tight tracking-wide sm:text-xs ${labelClass}`}>{label}</div>
      <div className="mt-0.5 text-xl font-black sm:mt-1 sm:text-2xl">{value}</div>
    </div>
  );
}

function historyScoresNeedPosting(row) {
  const match = row?.matches;

  if (isSpecialMatchResult(match)) return false;
  if (match?.score_status === "not_entered") return true;
  if (match?.score_status) return false;

  return (row?.line_games || []).every((game) => {
    const hasScore = game.home_score !== null && game.home_score !== undefined && game.away_score !== null && game.away_score !== undefined;
    return !hasScore && !specialGameStatus(game.game_status);
  });
}
