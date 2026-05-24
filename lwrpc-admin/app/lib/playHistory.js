import { formatDisplayDate } from "./dateTime";

export function formatDate(value) {
  return formatDisplayDate(value, "-");
}

export function formatPlayerName(member) {
  if (!member) return "Unknown Player";

  return (
    member.full_name ||
    `${member.first_name || ""} ${member.last_name || ""}`.trim() ||
    member.email ||
    "Unknown Player"
  );
}

export function historyFilterOptions(historyRows) {
  const options = new Map();

  historyRows.forEach((row) => {
    const match = row.matches;
    const league = match?.leagues;
    const season = league?.seasons;
    const key = `${season?.id || "no-season"}:${league?.id || "no-league"}`;
    const label = `${season?.name || "No Season"} / ${league?.name || "No League"}`;

    options.set(key, label);
  });

  return [...options.entries()]
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export function filterHistoryRows(historyRows, selectedFilter) {
  if (!selectedFilter) return historyRows;

  return historyRows.filter((row) => {
    const match = row.matches;
    const league = match?.leagues;
    const season = league?.seasons;
    const key = `${season?.id || "no-season"}:${league?.id || "no-league"}`;

    return key === selectedFilter;
  });
}

export function playerLineDetails(row, memberId) {
  const match = row.matches;
  const isHomePlayer =
    row.home_player_1_id === memberId || row.home_player_2_id === memberId;
  const playerTeamId = isHomePlayer ? match?.home_team_id : match?.away_team_id;
  const playerTeam = isHomePlayer ? match?.home_team : match?.away_team;
  const opponentTeam = isHomePlayer ? match?.away_team : match?.home_team;
  const playerGamesWon = isHomePlayer
    ? Number(row.home_team_games_won || 0)
    : Number(row.away_team_games_won || 0);
  const opponentGamesWon = isHomePlayer
    ? Number(row.away_team_games_won || 0)
    : Number(row.home_team_games_won || 0);

  let result = "T";
  if (row.winning_team_id === playerTeamId) result = "W";
  if (row.winning_team_id && row.winning_team_id !== playerTeamId) result = "L";

  return {
    playerTeamName: playerTeam?.name || "Your Team",
    opponentName: opponentTeam?.name || "Opponent",
    result,
    score: `${playerGamesWon}-${opponentGamesWon}`,
    sideLabel: isHomePlayer ? "Home" : "Away",
  };
}

export function specialGameStatus(gameStatus) {
  if (gameStatus === "forfeit_home") return { type: "forfeit", winnerSide: "Home", label: "Forfeit to Home" };
  if (gameStatus === "forfeit_away") return { type: "forfeit", winnerSide: "Away", label: "Forfeit to Away" };
  if (gameStatus === "retired_home") return { type: "retired", winnerSide: "Home", label: "Retired to Home" };
  if (gameStatus === "retired_away") return { type: "retired", winnerSide: "Away", label: "Retired to Away" };
  return null;
}

export function rowHasSpecialGame(row) {
  return (row.line_games || []).some((game) => specialGameStatus(game.game_status));
}

export function sortHistoryRows(historyRows) {
  return [...historyRows].sort((a, b) => {
    const aDate = `${a.matches?.scheduled_date || "0000-00-00"}T${a.matches?.scheduled_time || "00:00"}`;
    const bDate = `${b.matches?.scheduled_date || "0000-00-00"}T${b.matches?.scheduled_time || "00:00"}`;

    return bDate.localeCompare(aDate);
  });
}
