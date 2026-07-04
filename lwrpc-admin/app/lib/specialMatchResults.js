export const NORMAL_MATCH_RESULT_TYPE = "played";
export const SPECIAL_MATCH_RESULT_TYPES = ["forfeit", "weather"];

export function matchResultType(matchOrType) {
  const value = typeof matchOrType === "string"
    ? matchOrType
    : matchOrType?.result_type;

  return String(value || NORMAL_MATCH_RESULT_TYPE).trim().toLowerCase();
}

export function isSpecialMatchResult(matchOrType) {
  return SPECIAL_MATCH_RESULT_TYPES.includes(matchResultType(matchOrType));
}

export function specialMatchResultLabel(matchOrType) {
  const type = matchResultType(matchOrType);
  if (type === "forfeit") return "Forfeit";
  if (type === "weather") return "Weather";
  return "";
}

export function matchScoreText(match) {
  const hasHome = match?.home_score !== null && match?.home_score !== undefined;
  const hasAway = match?.away_score !== null && match?.away_score !== undefined;
  return hasHome && hasAway ? `${match.home_score} - ${match.away_score}` : "-";
}

export function specialMatchWinnerTeamId(match) {
  if (!match || !isSpecialMatchResult(match)) return null;

  const homeScore = Number(match.home_score);
  const awayScore = Number(match.away_score);

  if (!Number.isFinite(homeScore) || !Number.isFinite(awayScore)) return null;
  if (homeScore > awayScore) return match.home_team_id || null;
  if (awayScore > homeScore) return match.away_team_id || null;
  return null;
}

export function specialMatchWinnerName(match) {
  const winnerId = specialMatchWinnerTeamId(match);

  if (winnerId && String(winnerId) === String(match?.home_team_id)) {
    return match?.home_team?.name || "Home";
  }

  if (winnerId && String(winnerId) === String(match?.away_team_id)) {
    return match?.away_team?.name || "Away";
  }

  return "Tie";
}

