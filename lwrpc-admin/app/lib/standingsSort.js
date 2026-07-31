export function standingsRuleValue(row, rule) {
  if (rule === "line_wins") {
    const wins = Number(row?.line_wins ?? row?.lineWins ?? 0);
    const losses = Number(row?.line_losses ?? row?.lineLosses ?? 0);
    const ties = Number(row?.line_ties ?? row?.lineTies ?? 0);
    const played = wins + losses + ties;
    return played > 0 ? wins / played : 0;
  }

  if (rule === "game_wins") {
    const wins = Number(row?.match_wins ?? row?.wins ?? 0);
    const losses = Number(row?.match_losses ?? row?.losses ?? 0);
    const ties = Number(row?.match_ties ?? row?.ties ?? 0);
    const recordedPlayed = Number(row?.matches_played ?? row?.matchesPlayed ?? 0);
    const played = recordedPlayed > 0 ? recordedPlayed : wins + losses + ties;
    return played > 0 ? wins / played : 0;
  }

  return Number(row?.[rule] || 0);
}

export function isPercentageTiebreakRule(rule) {
  return rule === "line_wins" || rule === "game_wins";
}

export function formatStandingsRuleValue(row, rule) {
  const value = standingsRuleValue(row, rule);
  return isPercentageTiebreakRule(rule) ? `${(value * 100).toFixed(1)}%` : String(value);
}

export function sortStandingsByDivisionRules(rows, division) {
  const rules = [
    division?.standings_tiebreak_1 || "standings_points",
    division?.standings_tiebreak_2 || "line_wins",
    division?.standings_tiebreak_3 || "point_differential",
  ].filter(Boolean);

  return [...(rows || [])].sort((a, b) => {
    for (const rule of rules) {
      const aValue = standingsRuleValue(a, rule);
      const bValue = standingsRuleValue(b, rule);

      if (bValue !== aValue) {
        return bValue - aValue;
      }
    }

    const aRank = Number(a.rank || 0);
    const bRank = Number(b.rank || 0);

    if (aRank && bRank && aRank !== bRank) {
      return aRank - bRank;
    }

    return String(a.teams?.name || a.team_name || "").localeCompare(
      String(b.teams?.name || b.team_name || "")
    );
  });
}
