"use client";

import { standingsTiebreakRules, tiebreakLabel } from "../lib/standingsTiebreaks";

function valueForRule(leader, rule) {
  const values = {
    standings_points: leader?.points,
    line_wins: leader?.lineWins,
    game_wins: leader?.gameWins,
    point_differential: leader?.differential,
    points_for: leader?.pointsFor,
  };
  return Number(values[rule] || 0);
}

function signedValue(value) {
  return value > 0 ? `+${value}` : String(value);
}

export function hasStandingsTiebreak(leaders = [], division) {
  const primaryRule = standingsTiebreakRules(division)[0];
  const counts = new Map();

  leaders.forEach((leader) => {
    const value = valueForRule(leader, primaryRule);
    counts.set(value, Number(counts.get(value) || 0) + 1);
  });

  return [...counts.values()].some((count) => count > 1);
}

export default function StandingsTiebreakDetails({ leaders = [], division }) {
  const rules = standingsTiebreakRules(division);
  const primaryRule = rules[0];
  const tiedGroups = Object.values(
    leaders.reduce((groups, leader) => {
      const key = valueForRule(leader, primaryRule);
      groups[key] = groups[key] || [];
      groups[key].push(leader);
      return groups;
    }, {})
  ).filter((group) => group.length > 1);

  if (!tiedGroups.length) {
    return (
      <p className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-950">
        No teams are currently tied on {tiebreakLabel(primaryRule)}.
      </p>
    );
  }

  return (
    <section className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-slate-900">
      <h3 className="text-sm font-black">Tiebreak Details</h3>
      {tiedGroups.map((group) => {
        const decidingIndex = rules.findIndex((rule, index) =>
          index > 0 && new Set(group.map((leader) => valueForRule(leader, rule))).size > 1
        );
        const hasDecidingRule = decidingIndex >= 0;
        const visibleRules = rules.slice(0, hasDecidingRule ? decidingIndex + 1 : rules.length);
        const decidingRule = hasDecidingRule ? rules[decidingIndex] : null;
        const leader = [...group].sort((left, right) => Number(left.rank) - Number(right.rank))[0];
        const comparison = group
          .map((team) => `${team.team} (${valueForRule(team, decidingRule)})`)
          .join(" vs. ");

        return (
          <div key={`${primaryRule}-${valueForRule(group[0], primaryRule)}`} className="mt-3 overflow-hidden rounded-lg border border-slate-200 bg-white">
            <p className="border-b border-slate-200 px-3 py-2 text-xs font-bold text-slate-700">
              {group.length} teams tied on {tiebreakLabel(primaryRule)} ({valueForRule(group[0], primaryRule)}). {hasDecidingRule ? `#${leader.rank} ${leader.team} ranks higher on ${tiebreakLabel(decidingRule)}: ${comparison}.` : "They remain tied after all configured tiebreak metrics."}
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Team</th>
                    {visibleRules.map((rule) => <th className="px-3 py-2 text-right" key={rule}>{tiebreakLabel(rule)}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {[...group].sort((left, right) => Number(left.rank) - Number(right.rank)).map((team) => (
                    <tr key={team.id} className="border-t border-slate-100">
                      <td className="px-3 py-2 font-bold">#{team.rank} {team.team}</td>
                      {visibleRules.map((rule) => <td className="px-3 py-2 text-right font-black" key={rule}>{rule === "point_differential" ? signedValue(valueForRule(team, rule)) : valueForRule(team, rule)}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </section>
  );
}
