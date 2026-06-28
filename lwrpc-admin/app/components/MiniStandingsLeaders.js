"use client";

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
    )
    .slice(0, 5);

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

export default function MiniStandingsLeaders({ leaders, metricLabel, divisionName, selectedTeamId }) {
  if (!leaders?.length) return null;

  const maxValue = Math.max(1, ...leaders.map((leader) => Number(leader.chartValue || 0)));

  return (
    <div className="border-t border-emerald-100 bg-white px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-xs font-black uppercase tracking-wide text-emerald-700">
            Standings Leaders
          </div>
          <div className="text-[11px] font-bold text-slate-500">
            {divisionName || "Division"} / {metricLabel}
          </div>
        </div>
      </div>

      <div className="mt-2 space-y-1.5">
        {leaders.map((leader) => {
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
