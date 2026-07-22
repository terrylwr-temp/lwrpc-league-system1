"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const tooltipStyle = {
  borderRadius: "12px",
  border: "1px solid #cbd5e1",
  boxShadow: "0 12px 30px -20px rgba(15,23,42,0.75)",
  fontWeight: 700,
};

function formatWholePoints(value) {
  return Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 });
}

export function StandingsBarChartTooltip({ active, payload }) {
  const leader = payload?.[0]?.payload;

  if (!active || !leader) return null;

  return (
    <div className="rounded-xl border border-slate-300 bg-white px-3 py-2 shadow-lg">
      <p className="m-0 text-sm font-black text-slate-900">#{leader.rank || "-"} {leader.team || "Team"}</p>
      <p className="mt-1 text-sm font-bold text-slate-900">
        Standings Points ({leader.record || "0-0"}): {formatWholePoints(leader.points)}
      </p>
    </div>
  );
}

export default function DivisionStandingsBarChart({
  leaders = [],
  metricLabel = "Standings Points",
  selectedTeamId,
  playoffTeamIds = new Set(),
}) {
  const data = leaders.map((leader) => {
    const playoffTeam = playoffTeamIds.has(String(leader.teamId || leader.id));
    const selectedTeam = String(leader.teamId || "") === String(selectedTeamId || "");

    return {
      ...leader,
      chartLabel: `#${leader.rank} ${leader.team}`,
      playoffTeam,
      selectedTeam,
    };
  });
  const height = Math.max(170, data.length * 48 + 68);

  if (!data.length) {
    return <p className="m-0 py-5 text-center text-xs font-bold text-slate-500">No standings have been published for this division.</p>;
  }

  return (
    <section style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 8, right: 24, left: 18, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis type="number" allowDecimals tick={{ fontSize: 11, fontWeight: 700 }} />
          <YAxis type="category" dataKey="chartLabel" width={132} tick={{ fontSize: 11, fontWeight: 800 }} />
          <Tooltip contentStyle={tooltipStyle} content={<StandingsBarChartTooltip />} />
          <Bar dataKey="chartValue" name={metricLabel} minPointSize={4} radius={[0, 8, 8, 0]}>
            {data.map((leader) => (
              <Cell
                key={leader.id}
                fill={leader.playoffTeam ? "#059669" : leader.selectedTeam ? "#2563eb" : "#64748b"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </section>
  );
}
