const TIEBREAK_LABELS = {
  standings_points: "Standings Points",
  line_wins: "Line Wins",
  game_wins: "Game Wins",
  point_differential: "Point Differential",
  points_for: "Total Points For",
};

export function tiebreakLabel(rule) {
  return TIEBREAK_LABELS[rule] || String(rule || "").replaceAll("_", " ");
}

export function standingsTiebreakRules(division) {
  return [
    division?.standings_tiebreak_1 || "standings_points",
    division?.standings_tiebreak_2 || "line_wins",
    division?.standings_tiebreak_3 || "point_differential",
  ].filter(Boolean);
}

export function standingsTiebreakLabels(division) {
  return standingsTiebreakRules(division).map(tiebreakLabel);
}

export function standingsTiebreakDescription(division) {
  const labels = standingsTiebreakLabels(division);
  return labels.length
    ? `Teams are ranked by ${labels.map((label, index) => `${index + 1}. ${label}`).join("; ")}.`
    : "Teams are ranked using the division's configured tiebreak order.";
}
