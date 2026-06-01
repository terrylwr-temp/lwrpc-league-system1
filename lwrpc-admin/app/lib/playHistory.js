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

export function historyFilterOptions(historyRows, playerTeams = [], memberId = null) {
  const seasons = new Map();
  const leagues = new Map();
  const divisions = new Map();
  const teams = new Map();

  playerTeams.forEach((team) => {
    addHistoryScopeOption({
      seasons,
      leagues,
      divisions,
      teams,
      season: team?.divisions?.leagues?.seasons,
      league: team?.divisions?.leagues,
      division: team?.divisions,
      team,
    });
  });

  historyRows.forEach((row) => {
    const match = row.matches;
    const playerTeam = teamForHistoryRow(row, memberId);

    addHistoryScopeOption({
      seasons,
      leagues,
      divisions,
      teams,
      season: match?.leagues?.seasons,
      league: match?.leagues,
      division: match?.divisions,
      team: playerTeam,
    });
  });

  return {
    seasons: sortHistoryOptions([...seasons.values()]),
    leagues: sortHistoryOptions([...leagues.values()]),
    divisions: sortHistoryOptions([...divisions.values()]),
    teams: sortHistoryOptions([...teams.values()]),
  };
}

function addHistoryScopeOption({ seasons, leagues, divisions, teams, season, league, division, team }) {
  if (season?.id) {
    seasons.set(String(season.id), {
      id: season.id,
      name: season.name || "No Season",
    });
  }

  if (league?.id) {
    leagues.set(String(league.id), {
      id: league.id,
      name: league.name || "No League",
      seasonName: season?.name || "",
    });
  }

  if (division?.id) {
    divisions.set(String(division.id), {
      id: division.id,
      name: division.name || "No Division",
      leagueName: league?.name || "",
    });
  }

  if (team?.id) {
    teams.set(String(team.id), {
      id: team.id,
      name: team.name || "No Team",
      divisionName: team.divisions?.name || division?.name || "",
      leagueName: team.divisions?.leagues?.name || league?.name || "",
    });
  }
}

export function filterHistoryRows(historyRows, selectedFilter, memberId = null) {
  const [filterType, filterId] = String(selectedFilter || "all").split(":");
  if (!filterId || filterType === "all") return historyRows;

  return historyRows.filter((row) => {
    const match = row.matches;

    if (filterType === "season") {
      return String(match?.leagues?.season_id || match?.leagues?.seasons?.id || "") === String(filterId);
    }

    if (filterType === "league") {
      return String(match?.leagues?.id || "") === String(filterId);
    }

    if (filterType === "division") {
      return String(match?.divisions?.id || "") === String(filterId);
    }

    if (filterType === "team") {
      const playerTeam = teamForHistoryRow(row, memberId);
      if (playerTeam?.id) return String(playerTeam.id) === String(filterId);

      return (
        String(match?.home_team_id || "") === String(filterId) ||
        String(match?.away_team_id || "") === String(filterId)
      );
    }

    return true;
  });
}

function sortHistoryOptions(options) {
  return options.sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
}

function teamForHistoryRow(row, memberId) {
  const match = row.matches;

  if (memberId) {
    const isHomePlayer =
      row.home_player_1_id === memberId || row.home_player_2_id === memberId;
    const isAwayPlayer =
      row.away_player_1_id === memberId || row.away_player_2_id === memberId;

    if (isHomePlayer) return match?.home_team;
    if (isAwayPlayer) return match?.away_team;
  }

  return match?.home_team || match?.away_team || null;
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
