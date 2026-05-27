export function sortStandingsByDivisionRules(rows, division) {
  const rules = [
    division?.standings_tiebreak_1 || "standings_points",
    division?.standings_tiebreak_2 || "line_wins",
    division?.standings_tiebreak_3 || "point_differential",
  ].filter(Boolean);

  return [...(rows || [])].sort((a, b) => {
    for (const rule of rules) {
      const aValue = Number(a[rule] || 0);
      const bValue = Number(b[rule] || 0);

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
