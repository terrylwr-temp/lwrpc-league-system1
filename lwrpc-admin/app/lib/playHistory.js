import { formatDisplayDate } from "./dateTime";
import { isPicklebreakerLine } from "./matchScoring";
import { isSpecialMatchResult, specialMatchResultLabel } from "./specialMatchResults";

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

export function historyFilterOptions(historyRows, playerTeams = [], memberId = null, options = {}) {
  const seasons = new Map();
  const leagues = new Map();
  const divisions = new Map();
  const teams = new Map();
  const includeInactive = options.includeInactive !== false;

  playerTeams.forEach((team) => {
    if (!includeInactive && !historyScopeIsActive({
      season: team?.divisions?.leagues?.seasons,
      league: team?.divisions?.leagues,
      division: team?.divisions,
      team,
    })) {
      return;
    }

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

    if (!includeInactive && !historyScopeIsActive({
      season: match?.leagues?.seasons,
      league: match?.leagues,
      division: match?.divisions,
      team: playerTeam,
    })) {
      return;
    }

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
      abbreviation: season.abbreviation || "",
      isActive: season.is_active !== false,
    });
  }

  if (league?.id) {
    leagues.set(String(league.id), {
      id: league.id,
      name: league.name || "No League",
      abbreviation: league.abbreviation || "",
      seasonName: season?.name || "",
      seasonAbbreviation: season?.abbreviation || "",
      isActive: league.is_active !== false && season?.is_active !== false,
    });
  }

  if (division?.id) {
    divisions.set(String(division.id), {
      id: division.id,
      name: division.name || "No Division",
      leagueName: league?.name || "",
      isActive: division.is_active !== false && league?.is_active !== false && season?.is_active !== false,
    });
  }

  if (team?.id) {
    const existing = teams.get(String(team.id)) || {};
    const teamDivision = team.divisions || division;
    const teamLeague = teamDivision?.leagues || league;
    const teamSeason = teamLeague?.seasons || season;

    teams.set(String(team.id), {
      ...existing,
      id: team.id,
      name: team.name || existing.name || "No Team",
      isActive: historyScopeIsActive({
        season: teamSeason,
        league: teamLeague,
        division: teamDivision,
        team,
      }) && existing.isActive !== false,
      divisionName: teamDivision?.name || existing.divisionName || "",
      leagueName: teamLeague?.name || existing.leagueName || "",
      leagueAbbreviation: teamLeague?.abbreviation || existing.leagueAbbreviation || "",
      seasonName: teamSeason?.name || existing.seasonName || "",
      seasonAbbreviation: teamSeason?.abbreviation || existing.seasonAbbreviation || "",
    });
  }
}

export function historyTeamOptionLabel(team) {
  const name = team?.name || "No Team";

  if (team?.isActive !== false) {
    return name;
  }

  return [
    name,
    team.divisionName,
    team.leagueAbbreviation || team.leagueName,
    team.seasonAbbreviation || team.seasonName,
  ].filter(Boolean).join(" / ");
}

export function filterHistoryRows(historyRows, selectedFilter, memberId = null, playerTeams = []) {
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
      const selectedTeam = teamById(playerTeams, filterId);
      const playerTeam = teamForHistoryRow(row, memberId);
      const playerTeamIds = teamIdsForHistoryRow(row, memberId);

      if (playerTeamIds.some((teamId) => String(teamId) === String(filterId))) {
        return true;
      }

      if (selectedTeam && playerTeam && sameTeamIdentity(playerTeam, selectedTeam, match)) {
        return true;
      }

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

function teamById(teams, teamId) {
  return (teams || []).find((team) => String(team?.id || "") === String(teamId));
}

function teamForHistoryRow(row, memberId) {
  const match = row.matches;
  const side = historyRowPlayerSide(row, memberId);

  if (side === "home") return match?.home_team || { id: match?.home_team_id };
  if (side === "away") return match?.away_team || { id: match?.away_team_id };

  return match?.home_team || match?.away_team || null;
}

function teamIdsForHistoryRow(row, memberId) {
  const match = row.matches;
  const side = historyRowPlayerSide(row, memberId);

  if (side === "home") return [match?.home_team_id, match?.home_team?.id].filter(Boolean);
  if (side === "away") return [match?.away_team_id, match?.away_team?.id].filter(Boolean);

  return [
    match?.home_team_id,
    match?.home_team?.id,
    match?.away_team_id,
    match?.away_team?.id,
  ].filter(Boolean);
}

function historyRowPlayerSide(row, memberId) {
  const id = String(memberId || "");
  if (!id) return "";

  const homePlayerIds = [
    row.home_player_1_id,
    row.home_player_2_id,
    row.home_player_1?.id,
    row.home_player_2?.id,
  ];
  const awayPlayerIds = [
    row.away_player_1_id,
    row.away_player_2_id,
    row.away_player_1?.id,
    row.away_player_2?.id,
  ];

  if (homePlayerIds.some((playerId) => String(playerId || "") === id)) return "home";
  if (awayPlayerIds.some((playerId) => String(playerId || "") === id)) return "away";

  return "";
}

function sameTeamIdentity(playerTeam, selectedTeam, match) {
  if (normalizeTeamName(playerTeam?.name) !== normalizeTeamName(selectedTeam?.name)) {
    return false;
  }

  const selectedDivisionId = selectedTeam?.division_id || selectedTeam?.divisions?.id;
  const rowDivisionId = match?.division_id || match?.divisions?.id;

  return !selectedDivisionId || !rowDivisionId || String(selectedDivisionId) === String(rowDivisionId);
}

function normalizeTeamName(name) {
  return String(name || "").trim().toLowerCase();
}

export function playerLineDetails(row, memberId) {
  const match = row.matches;
  const isHomePlayer = historyRowPlayerSide(row, memberId) === "home";
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

export function historyRowIsActive(row, memberId = null) {
  const match = row.matches;
  const playerTeam = teamForHistoryRow(row, memberId);

  return historyScopeIsActive({
    season: match?.leagues?.seasons,
    league: match?.leagues,
    division: match?.divisions,
    team: playerTeam,
  });
}

function historyScopeIsActive({ season, league, division, team }) {
  return (
    season?.is_active !== false &&
    league?.is_active !== false &&
    division?.is_active !== false &&
    team?.is_active !== false
  );
}

export function specialGameStatus(gameStatus) {
  if (gameStatus === "forfeit_home") return { type: "forfeit", winnerSide: "Home", label: "Forfeit to Home" };
  if (gameStatus === "forfeit_away") return { type: "forfeit", winnerSide: "Away", label: "Forfeit to Away" };
  if (gameStatus === "retired_home") return { type: "retired", winnerSide: "Home", label: "Retired to Home" };
  if (gameStatus === "retired_away") return { type: "retired", winnerSide: "Away", label: "Retired to Away" };
  return null;
}

export function historyScoreSummary(row, sideLabel) {
  const match = row?.matches;

  if (isSpecialMatchResult(match)) {
    const isHomePlayer = sideLabel === "Home";
    const hasHomeScore = match.home_score !== null && match.home_score !== undefined;
    const hasAwayScore = match.away_score !== null && match.away_score !== undefined;
    const resultLabel = specialMatchResultLabel(match);

    if (hasHomeScore && hasAwayScore) {
      const playerScore = isHomePlayer ? match.home_score : match.away_score;
      const opponentScore = isHomePlayer ? match.away_score : match.home_score;
      return `${playerScore}-${opponentScore} ${resultLabel}`;
    }

    return resultLabel || "Scores pending";
  }

  const isHomePlayer = sideLabel === "Home";
  const scoredGames = [...(row?.line_games || [])]
    .sort((a, b) => Number(a.game_number || 0) - Number(b.game_number || 0))
    .filter((game) => {
      const hasScore = game.home_score !== null && game.away_score !== null;
      return hasScore || specialGameStatus(game.game_status);
    });

  if (scoredGames.length === 0) {
    return "Scores pending";
  }

  return scoredGames
    .map((game) => {
      const playerScore = isHomePlayer ? game.home_score : game.away_score;
      const opponentScore = isHomePlayer ? game.away_score : game.home_score;
      const score = `${playerScore ?? "-"}-${opponentScore ?? "-"}`;
      const special = specialGameStatus(game.game_status);

      return special ? `${score} ${special.label}` : score;
    })
    .join(", ");
}

export function rowHasSpecialGame(row) {
  return (row.line_games || []).some((game) => specialGameStatus(game.game_status));
}

export function rowCountsForIndividualWinLoss(row) {
  return !isPicklebreakerLine(row);
}

export function sortHistoryRows(historyRows) {
  return [...historyRows].sort((a, b) => {
    const aDate = `${a.matches?.scheduled_date || "0000-00-00"}T${a.matches?.scheduled_time || "00:00"}`;
    const bDate = `${b.matches?.scheduled_date || "0000-00-00"}T${b.matches?.scheduled_time || "00:00"}`;

    return bDate.localeCompare(aDate);
  });
}
