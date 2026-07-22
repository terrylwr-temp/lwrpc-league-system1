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

function formatValue(value) {
  const number = Number(value || 0);
  return Number.isInteger(number) ? String(number) : number.toFixed(1);
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
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(value, name, item) => [
              formatValue(value),
              `${name} (${item?.payload?.record || "0-0"})${item?.payload?.playoffTeam ? " · Playoff position" : ""}`,
            ]}
          />
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
