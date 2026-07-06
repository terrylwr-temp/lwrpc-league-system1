"use client";

import { useState } from "react";

export function buildMiniStandingsLeaders(standings = [], selectedTeam = null) {
  const divisionId = selectedTeam?.division_id || selectedTeam?.divisions?.id;

  if (!divisionId) {
    return {
      leaders: [],
      metricLabel: "Standings Points",
    };
  }

  const leaders = standings
    .filter((row) =>
      String(row.division_id || "") === String(divisionId) &&
      Number(row.rank || 0) > 0
    )
    .map((row) => ({
      id: row.id || `${row.division_id || ""}:${row.team_id || ""}`,
      teamId: row.team_id,
      team: row.teams?.name || row.team_name || "Team",
      rank: Number(row.rank || 0),
      points: Number(row.standings_points || 0),
      wins: Number(row.match_wins || 0),
      losses: Number(row.match_losses || 0),
      ties: Number(row.match_ties || 0),
      differential: Number(row.point_differential || 0),
    }))
    .sort((a, b) =>
      a.rank - b.rank ||
      b.points - a.points ||
      b.differential - a.differential ||
      a.team.localeCompare(b.team)
    );

  const usesPoints = leaders.some((leader) => leader.points !== 0);

  return {
    metricLabel: usesPoints ? "Standings Points" : "Match Wins",
    leaders: leaders.map((leader) => ({
      ...leader,
      chartValue: usesPoints ? leader.points : leader.wins,
      record: `${leader.wins}-${leader.losses}${leader.ties ? `-${leader.ties}` : ""}`,
    })),
  };
}

export default function MiniStandingsLeaders({ leaders, metricLabel, divisionName, selectedTeamId, framed = false }) {
  const [mobileChartOpen, setMobileChartOpen] = useState(false);
  const [includeAllTeams, setIncludeAllTeams] = useState(false);
  const availableLeaders = leaders || [];
  const displayedLeaders = includeAllTeams ? availableLeaders : availableLeaders.slice(0, 5);

  if (!availableLeaders.length) return null;

  const maxValue = Math.max(1, ...displayedLeaders.map((leader) => Number(leader.chartValue || 0)));

  return (
    <div className={`bg-white px-4 py-3 ${
      framed
        ? "mx-4 mb-4 overflow-hidden rounded-xl border-2 border-emerald-200 shadow-sm ring-1 ring-emerald-100"
        : "border-t border-emerald-100"
    }`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="hidden min-w-0 flex-1 sm:flex">
          <div className="min-w-0 max-w-full border-l-4 border-emerald-500 bg-emerald-50/70 py-1 pl-3 pr-2 text-sm font-black uppercase tracking-wide text-emerald-900">
            <span className="block truncate">{divisionName || "Division"} / {metricLabel}</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setMobileChartOpen((current) => !current)}
            className="rounded-full border border-slate-300 bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 sm:hidden"
            aria-expanded={mobileChartOpen}
          >
            {mobileChartOpen ? "Hide Chart" : "View Standings Chart"}
          </button>
          <button
            type="button"
            onClick={() => setIncludeAllTeams((current) => !current)}
            className={`${mobileChartOpen ? "inline-flex" : "hidden"} rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide transition sm:inline-flex ${
              includeAllTeams
                ? "border-emerald-600 bg-emerald-600 text-white"
                : "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
            }`}
            aria-pressed={includeAllTeams}
          >
            Include all Teams
          </button>
        </div>
      </div>

      <div className={`${mobileChartOpen ? "block" : "hidden"} mt-2 space-y-1.5 sm:block`}>
        {displayedLeaders.map((leader) => {
          const selected = String(leader.teamId || "") === String(selectedTeamId || "");
          const width = Math.max(7, Math.round((Number(leader.chartValue || 0) / maxValue) * 100));

          return (
            <div key={leader.id} className="grid grid-cols-[minmax(6.5rem,9rem)_1fr_auto] items-center gap-2 text-xs">
              <div className={`truncate font-black ${selected ? "text-emerald-800" : "text-slate-700"}`}>
                #{leader.rank} {leader.team}
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full ${selected ? "bg-emerald-600" : "bg-blue-700"}`}
                  style={{ width: `${width}%` }}
                />
              </div>
              <div className="min-w-10 text-right font-black text-slate-900">
                {formatMiniStandingsValue(leader.chartValue)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatMiniStandingsValue(value) {
  const number = Number(value || 0);
  return Number.isInteger(number) ? String(number) : number.toFixed(1);
}
