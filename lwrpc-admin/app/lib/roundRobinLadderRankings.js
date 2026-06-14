export const LADDER_RANKING_CRITERIA_OPTIONS = [
  { value: "total_points", label: "Total Points" },
  { value: "head_to_head", label: "Head-to-Head" },
  { value: "win_pct", label: "Win %" },
  { value: "point_differential", label: "Point Differential" },
];

export const DEFAULT_LADDER_RANKING_CRITERIA = ["total_points", "head_to_head", "win_pct"];

const VALID_LADDER_RANKING_CRITERIA = new Set(LADDER_RANKING_CRITERIA_OPTIONS.map((option) => option.value));

export function normalizeLadderRankingCriteria(value) {
  const source = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : [];
  const next = [];

  source.forEach((item) => {
    const clean = String(item || "").trim();
    if (!VALID_LADDER_RANKING_CRITERIA.has(clean) || next.includes(clean)) return;
    next.push(clean);
  });

  LADDER_RANKING_CRITERIA_OPTIONS.forEach((option) => {
    if (next.length >= 3) return;
    if (!next.includes(option.value)) next.push(option.value);
  });

  return next.slice(0, 3);
}

export function ladderRankingCriteriaLabel(value) {
  return LADDER_RANKING_CRITERIA_OPTIONS.find((option) => option.value === value)?.label || "Total Points";
}

export function compareLadderRowsByCriteria(first, second, matches = [], criteria = DEFAULT_LADDER_RANKING_CRITERIA) {
  const rankingCriteria = normalizeLadderRankingCriteria(criteria);

  for (const criterion of rankingCriteria) {
    const compared = compareByCriterion(first, second, matches, criterion);
    if (compared !== 0) return compared;
  }

  const secondGames = gamesForRow(second);
  const firstGames = gamesForRow(first);
  if (secondGames !== firstGames) return secondGames - firstGames;
  return displayNameForRow(first).localeCompare(displayNameForRow(second));
}

function compareByCriterion(first, second, matches, criterion) {
  if (criterion === "total_points") {
    return numericValue(second, ["points_for", "pointsFor"]) - numericValue(first, ["points_for", "pointsFor"]);
  }
  if (criterion === "head_to_head") {
    const headToHead = headToHeadResult(playerIdForRow(first), playerIdForRow(second), matches);
    return headToHead !== 0 ? -headToHead : 0;
  }
  if (criterion === "win_pct") {
    return winPctForRow(second) - winPctForRow(first);
  }
  if (criterion === "point_differential") {
    return numericValue(second, ["point_diff", "pointDiff"]) - numericValue(first, ["point_diff", "pointDiff"]);
  }
  return 0;
}

function headToHeadResult(firstPlayerId, secondPlayerId, matches = []) {
  if (!firstPlayerId || !secondPlayerId) return 0;
  let firstWins = 0;
  let secondWins = 0;

  matches.forEach((match) => {
    const team1Score = numericScore(match.team1_score);
    const team2Score = numericScore(match.team2_score);
    if (team1Score === null || team2Score === null || team1Score === team2Score) return;

    const team1Ids = (match.team1_players || []).map((player) => String(player.id));
    const team2Ids = (match.team2_players || []).map((player) => String(player.id));
    const firstTeam = team1Ids.includes(firstPlayerId) ? 1 : team2Ids.includes(firstPlayerId) ? 2 : 0;
    const secondTeam = team1Ids.includes(secondPlayerId) ? 1 : team2Ids.includes(secondPlayerId) ? 2 : 0;
    if (!firstTeam || !secondTeam || firstTeam === secondTeam) return;

    const winningTeam = team1Score > team2Score ? 1 : 2;
    if (firstTeam === winningTeam) firstWins += 1;
    if (secondTeam === winningTeam) secondWins += 1;
  });

  return firstWins - secondWins;
}

function playerIdForRow(row) {
  return String(row?.player_id || row?.playerId || row?.id || "");
}

function displayNameForRow(row) {
  return String(row?.display_name || row?.displayName || row?.name || "");
}

function winPctForRow(row) {
  const explicit = row?.winPct;
  if (Number.isFinite(Number(explicit))) return Number(explicit);
  const games = gamesForRow(row);
  return games > 0 ? numericValue(row, ["wins"]) / games : 0;
}

function gamesForRow(row) {
  const explicitGames = numericValue(row, ["games", "matchesPlayed"]);
  if (explicitGames > 0) return explicitGames;
  return numericValue(row, ["wins"]) + numericValue(row, ["losses"]);
}

function numericValue(row, keys) {
  for (const key of keys) {
    if (row?.[key] !== undefined && row?.[key] !== null && row?.[key] !== "") {
      const numeric = Number(row[key]);
      return Number.isFinite(numeric) ? numeric : 0;
    }
  }
  return 0;
}

function numericScore(value) {
  if (value === null || value === undefined || value === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}
