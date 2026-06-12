export function lineTypeKey(value) {
  return String(value || "").trim().toLowerCase().replace(/[\s_-]+/g, "_");
}

export function isPicklebreakerLine(line) {
  return lineTypeKey(line?.division_lines?.line_type || line?.line_type) === "picklebreaker";
}

export function scoreRuleSettings(line) {
  return {
    pointsToWin: Number(line?.division_lines?.points_to_win ?? line?.points_to_win ?? 0),
    winBy: Number(line?.division_lines?.win_by ?? line?.win_by ?? 0),
  };
}

export function gameWinnerSide(game, line = null) {
  if (game?.game_status === "forfeit_home" || game?.game_status === "retired_home") return "home";
  if (game?.game_status === "forfeit_away" || game?.game_status === "retired_away") return "away";
  if (game?.home_score !== null && game?.home_score !== undefined && game?.away_score !== null && game?.away_score !== undefined) {
    const homeScore = Number(game.home_score);
    const awayScore = Number(game.away_score);
    const { pointsToWin, winBy } = scoreRuleSettings(line);

    if (!Number.isFinite(homeScore) || !Number.isFinite(awayScore)) return "";
    if (homeScore === awayScore) return "";

    const highScore = Math.max(homeScore, awayScore);
    const lowScore = Math.min(homeScore, awayScore);

    if (pointsToWin > 0) {
      if (winBy === 1 && highScore !== pointsToWin) return "";
      if (winBy > 1 && highScore < pointsToWin) return "";
      if (winBy > 0 && highScore - lowScore < winBy) return "";
    }

    if (homeScore > awayScore) return "home";
    if (awayScore > homeScore) return "away";
  }
  return "";
}

export function gameHasScoreEntry(game) {
  return (
    (game?.home_score !== null && game?.home_score !== undefined) ||
    (game?.away_score !== null && game?.away_score !== undefined) ||
    (game?.game_status && game.game_status !== "scheduled")
  );
}

export function lineGamesNeededToWin(lineGames = []) {
  const gameCount = lineGames.length;
  return gameCount > 1 && gameCount % 2 === 1 ? Math.floor(gameCount / 2) + 1 : gameCount;
}

export function requiredLineGameIds(lineGames = [], line = null) {
  const sortedGames = [...lineGames].sort((a, b) => Number(a.game_number || 0) - Number(b.game_number || 0));
  const neededToWin = lineGamesNeededToWin(sortedGames);
  const requiredIds = new Set();
  let homeWins = 0;
  let awayWins = 0;

  sortedGames.forEach((game) => {
    if (neededToWin > 0 && (homeWins >= neededToWin || awayWins >= neededToWin)) return;
    requiredIds.add(String(game.id));

    const winner = gameWinnerSide(game, line);
    if (winner === "home") homeWins += 1;
    if (winner === "away") awayWins += 1;
  });

  return requiredIds;
}

export function requiredLineGames(lineGames = [], line = null) {
  const requiredIds = requiredLineGameIds(lineGames, line);
  return lineGames.filter((game) => requiredIds.has(String(game.id)));
}

export function lineScoreRequired(line) {
  const value = line?.division_lines?.score_required ?? line?.score_required;
  return value !== false && value !== "false" && value !== 0 && value !== "0";
}

export function lineRequiresValidation(line, lineGames = []) {
  return lineScoreRequired(line) || lineGames.some(gameHasScoreEntry);
}

export function getLineSummary(line, lineGames = [], match = null) {
  const requiredGames = requiredLineGames(lineGames, line);
  let homeGameWins = 0;
  let awayGameWins = 0;
  let homePoints = 0;
  let awayPoints = 0;

  requiredGames.forEach((game) => {
    if (game.home_score !== null && game.home_score !== undefined && game.away_score !== null && game.away_score !== undefined) {
      homePoints += Number(game.home_score || 0);
      awayPoints += Number(game.away_score || 0);
    }

    const winnerSide = gameWinnerSide(game, line);
    if (winnerSide === "home") homeGameWins += 1;
    if (winnerSide === "away") awayGameWins += 1;
  });

  let winningTeamId = null;
  let winnerName = "-";

  if (homeGameWins > awayGameWins) {
    winningTeamId = match?.home_team_id || null;
    winnerName = match?.home_team?.name || "Home";
  }

  if (awayGameWins > homeGameWins) {
    winningTeamId = match?.away_team_id || null;
    winnerName = match?.away_team?.name || "Away";
  }

  return {
    homeGameWins,
    awayGameWins,
    homePoints,
    awayPoints,
    winningTeamId,
    winnerName,
  };
}

export function standardLinePointAwards(line, summary, match) {
  const configuredPoints = Number(line?.division_lines?.team_win_points ?? line?.team_win_points ?? 1);

  if ((line?.division_lines?.standings_points_mode || line?.standings_points_mode) === "per_game") {
    return {
      home: Number(summary?.homeGameWins || 0) * configuredPoints,
      away: Number(summary?.awayGameWins || 0) * configuredPoints,
    };
  }

  return {
    home: summary?.winningTeamId === match?.home_team_id ? configuredPoints : 0,
    away: summary?.winningTeamId === match?.away_team_id ? configuredPoints : 0,
  };
}

export function picklebreakerNotPlayedPoints(line) {
  return Number(
    line?.division_lines?.picklebreaker_not_played_points ??
    line?.picklebreaker_not_played_points ??
    0
  );
}

function gamesForLine(games = [], lineId) {
  return games.filter((game) => String(game.match_line_id || "") === String(lineId || ""));
}

export function matchPointSummary(lines = [], games = [], match = null) {
  const sortedLines = [...(lines || [])].sort((a, b) =>
    Number(a.division_lines?.line_number || a.line_number || 0) - Number(b.division_lines?.line_number || b.line_number || 0)
  );
  const summariesByLineId = {};
  const pointsByLineId = {};
  let regularHome = 0;
  let regularAway = 0;

  sortedLines.forEach((line) => {
    const lineGames = gamesForLine(games, line.id);
    const summary = getLineSummary(line, lineGames, match);
    summariesByLineId[String(line.id)] = summary;

    if (isPicklebreakerLine(line)) return;

    const points = standardLinePointAwards(line, summary, match);
    regularHome += Number(points.home || 0);
    regularAway += Number(points.away || 0);
    pointsByLineId[String(line.id)] = {
      ...points,
      mode: "played",
      played: true,
      pointAwardTeamId: points.home > points.away ? match?.home_team_id : points.away > points.home ? match?.away_team_id : null,
    };
  });

  const regularLeaderSide = regularHome > regularAway ? "home" : regularAway > regularHome ? "away" : "";
  const regularLeaderTeamId = regularLeaderSide === "home" ? match?.home_team_id : regularLeaderSide === "away" ? match?.away_team_id : null;
  const regularTied = regularHome === regularAway;
  let home = regularHome;
  let away = regularAway;

  sortedLines.forEach((line) => {
    if (!isPicklebreakerLine(line)) return;

    const lineGames = gamesForLine(games, line.id);
    const played = lineGames.some(gameHasScoreEntry);
    const summary = summariesByLineId[String(line.id)] || getLineSummary(line, lineGames, match);
    const notPlayedPoints = picklebreakerNotPlayedPoints(line);
    let points = { home: 0, away: 0 };
    let mode = "unawarded";
    let pointAwardTeamId = null;

    if (played) {
      points = standardLinePointAwards(line, summary, match);
      mode = "played";
      pointAwardTeamId = summary.winningTeamId;
    } else if (regularLeaderSide && notPlayedPoints > 0) {
      points = {
        home: regularLeaderSide === "home" ? notPlayedPoints : 0,
        away: regularLeaderSide === "away" ? notPlayedPoints : 0,
      };
      mode = "not_played";
      pointAwardTeamId = regularLeaderTeamId;
    }

    home += Number(points.home || 0);
    away += Number(points.away || 0);
    pointsByLineId[String(line.id)] = {
      ...points,
      mode,
      played,
      pointAwardTeamId,
      regularLeaderSide,
      regularLeaderTeamId,
      regularTied,
    };
  });

  const winningTeamId = home > away ? match?.home_team_id : away > home ? match?.away_team_id : null;
  const winnerName =
    winningTeamId === match?.home_team_id
      ? match?.home_team?.name || "Home"
      : winningTeamId === match?.away_team_id
        ? match?.away_team?.name || "Away"
        : "-";

  return {
    home,
    away,
    homeWins: home,
    awayWins: away,
    winningTeamId,
    winnerName,
    regularHome,
    regularAway,
    regularTied,
    regularLeaderSide,
    regularLeaderTeamId,
    summariesByLineId,
    pointsByLineId,
  };
}

export function picklebreakerValidationIssues(lines = [], games = [], match = null, lineLabel = (line) => line?.division_lines?.line_name || `Game ${line?.line_number || ""}`) {
  const summary = matchPointSummary(lines, games, match);
  const issues = [];

  (lines || []).filter(isPicklebreakerLine).forEach((line) => {
    const lineGames = gamesForLine(games, line.id);
    const played = lineGames.some(gameHasScoreEntry);
    const label = lineLabel(line);

    if (summary.regularTied && !played) {
      issues.push({
        lineId: line.id,
        gameId: null,
        message: `${label}: Picklebreaker is required because the regular game-line team points are tied.`,
      });
    }

    if (!summary.regularTied && played) {
      issues.push({
        lineId: line.id,
        gameId: null,
        message: `${label}: only enter the Picklebreaker when the regular game-line team points are tied.`,
      });
    }
  });

  return issues;
}
