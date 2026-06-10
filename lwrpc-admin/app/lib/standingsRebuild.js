function gameSummary(game) {
  if (game.game_status === "forfeit_home" || game.game_status === "retired_home") {
    return { homeGameWins: 1, awayGameWins: 0, homePoints: 0, awayPoints: 0 };
  }

  if (game.game_status === "forfeit_away" || game.game_status === "retired_away") {
    return { homeGameWins: 0, awayGameWins: 1, homePoints: 0, awayPoints: 0 };
  }

  const homeScore = Number(game.home_score || 0);
  const awayScore = Number(game.away_score || 0);

  return {
    homeGameWins: homeScore > awayScore ? 1 : 0,
    awayGameWins: awayScore > homeScore ? 1 : 0,
    homePoints: homeScore,
    awayPoints: awayScore,
  };
}

function emptyStanding(division, teamId) {
  return {
    league_id: division.league_id,
    division_id: division.id,
    team_id: teamId,
    matches_played: 0,
    match_wins: 0,
    match_losses: 0,
    match_ties: 0,
    line_wins: 0,
    line_losses: 0,
    line_ties: 0,
    game_wins: 0,
    game_losses: 0,
    points_for: 0,
    points_against: 0,
    point_differential: 0,
    standings_points: 0,
    home_wins: 0,
    home_losses: 0,
    away_wins: 0,
    away_losses: 0,
    recentResults: [],
  };
}

function lineStandingsPoints(line, winningTeamId, matchRow) {
  const mode = line.division_lines?.standings_points_mode || "line_result";
  const teamWinPoints = Number(line.division_lines?.team_win_points ?? 1);

  if (mode === "per_game") {
    return {
      home: Number(line.rebuilt?.homeGameWins || 0) * teamWinPoints,
      away: Number(line.rebuilt?.awayGameWins || 0) * teamWinPoints,
    };
  }

  return {
    home: winningTeamId === matchRow.home_team_id ? teamWinPoints : 0,
    away: winningTeamId === matchRow.away_team_id ? teamWinPoints : 0,
  };
}

function applyRecentFields(team) {
  const recent = team.recentResults.slice(-5);
  team.recent_form = recent.join("");

  if (recent.length > 0) {
    const last = recent[recent.length - 1];
    let streak = 0;

    for (let i = recent.length - 1; i >= 0; i--) {
      if (recent[i] === last) streak++;
      else break;
    }

    team.current_streak = `${last}${streak}`;
  } else {
    team.current_streak = "-";
  }

  delete team.recentResults;
  return team;
}

function sortStandingsRows(rows, division) {
  const rules = [
    division.standings_tiebreak_1,
    division.standings_tiebreak_2,
    division.standings_tiebreak_3,
  ].filter(Boolean);

  return rows.sort((a, b) => {
    for (const rule of rules) {
      if ((b[rule] || 0) !== (a[rule] || 0)) {
        return (b[rule] || 0) - (a[rule] || 0);
      }
    }

    return String(a.team_name || "").localeCompare(String(b.team_name || ""));
  });
}

function scheduleWeekKey(divisionId, weekNumber, date) {
  return `${divisionId || ""}:${weekNumber || ""}:${date || ""}`;
}

function filterByesForPublishedSchedule(byes, matches) {
  const publishedScheduleKeys = new Set(
    (matches || []).map((match) =>
      scheduleWeekKey(match.division_id, match.week_number, match.scheduled_date)
    )
  );

  return (byes || []).filter((bye) =>
    publishedScheduleKeys.has(scheduleWeekKey(bye.division_id, bye.week_number, bye.bye_date))
  );
}

function publishedScheduleIsFullyVerified(matches) {
  const publishedMatches = matches || [];

  return (
    publishedMatches.length > 0 &&
    publishedMatches.every((match) =>
      match.status === "completed" && match.score_status === "verified"
    )
  );
}

function roundStandingsPoints(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

function applyFinalByeAdjustments(rows, byes, publishedMatches) {
  if (!publishedScheduleIsFullyVerified(publishedMatches)) {
    return { rows, applied: false };
  }

  const byeCountsByTeamId = filterByesForPublishedSchedule(byes, publishedMatches).reduce((counts, bye) => {
    const key = String(bye.team_id || "");
    if (!key) return counts;

    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});

  const rowByeCounts = (rows || []).map((row) =>
    byeCountsByTeamId[String(row.team_id || "")] || 0
  );
  const hasBye = rowByeCounts.some((count) => count > 0);
  const hasNoBye = rowByeCounts.some((count) => count === 0);

  if (!hasBye || !hasNoBye) {
    return { rows, applied: false };
  }

  let applied = false;
  const adjustedRows = rows.map((row) => {
    const byeCount = byeCountsByTeamId[String(row.team_id || "")] || 0;
    if (byeCount <= 0 || Number(row.matches_played || 0) <= 0) return row;

    const averagePoints = Number(row.standings_points || 0) / Number(row.matches_played || 0);
    const adjustment = averagePoints * byeCount;
    if (adjustment > 0) applied = true;

    row.standings_points = roundStandingsPoints(
      Number(row.standings_points || 0) + adjustment
    );

    return row;
  });

  return { rows: adjustedRows, applied };
}

export async function rebuildDivisionStandingsForDivision(supabase, divisionId) {
  if (!divisionId) {
    return { success: false, error: "Select a division before rebuilding statistics." };
  }

  const { data: division, error: divisionError } = await supabase
    .from("divisions")
    .select("*")
    .eq("id", divisionId)
    .single();

  if (divisionError) return { success: false, error: divisionError.message };

  const { data: divisionTeams, error: teamsError } = await supabase
    .from("teams")
    .select("id, name")
    .eq("division_id", divisionId)
    .order("name", { ascending: true });

  if (teamsError) return { success: false, error: teamsError.message };

  const { data: verifiedMatches, error: matchesError } = await supabase
    .from("matches")
    .select(`
      id,
      league_id,
      division_id,
      home_team_id,
      away_team_id,
      scheduled_date,
      scheduled_time,
      status,
      score_status,
      match_lines (
        id,
        line_number,
        division_line_id,
        winning_team_id,
        home_team_games_won,
        away_team_games_won,
        home_team_points,
        away_team_points,
        division_lines (
          team_win_points,
          standings_points_mode
        ),
        line_games (
          id,
          game_number,
          home_score,
          away_score,
          game_status
        )
      )
    `)
    .eq("division_id", divisionId)
    .eq("status", "completed")
    .eq("score_status", "verified")
    .order("scheduled_date", { ascending: true })
    .order("scheduled_time", { ascending: true });

  if (matchesError) return { success: false, error: matchesError.message };

  const { data: publishedMatches, error: publishedMatchesError } = await supabase
    .from("matches")
    .select("id, division_id, week_number, scheduled_date, status, score_status")
    .eq("division_id", divisionId)
    .eq("is_published", true);

  if (publishedMatchesError) return { success: false, error: publishedMatchesError.message };

  const { data: divisionByes, error: byesError } = await supabase
    .from("team_byes")
    .select("id, team_id, division_id, week_number, bye_date")
    .eq("division_id", divisionId);

  if (byesError) return { success: false, error: byesError.message };

  const standingsMap = {};

  (divisionTeams || []).forEach((team) => {
    standingsMap[team.id] = {
      ...emptyStanding(division, team.id),
      team_name: team.name || "",
    };
  });

  const ensureTeam = (teamId) => {
    if (!standingsMap[teamId]) {
      standingsMap[teamId] = {
        ...emptyStanding(division, teamId),
        team_name: "",
      };
    }

    return standingsMap[teamId];
  };

  for (const matchRow of verifiedMatches || []) {
    const home = ensureTeam(matchRow.home_team_id);
    const away = ensureTeam(matchRow.away_team_id);
    let homeTeamWinPoints = 0;
    let awayTeamWinPoints = 0;

    (matchRow.match_lines || []).forEach((line) => {
      let homeGameWins = 0;
      let awayGameWins = 0;
      let homePoints = 0;
      let awayPoints = 0;

      (line.line_games || []).forEach((game) => {
        const summary = gameSummary(game);
        homeGameWins += summary.homeGameWins;
        awayGameWins += summary.awayGameWins;
        homePoints += summary.homePoints;
        awayPoints += summary.awayPoints;
      });

      const winningTeamId =
        homeGameWins > awayGameWins
          ? matchRow.home_team_id
          : awayGameWins > homeGameWins
          ? matchRow.away_team_id
          : null;

      line.rebuilt = {
        winningTeamId,
        homeGameWins,
        awayGameWins,
        homePoints,
        awayPoints,
      };

      home.game_wins += homeGameWins;
      home.game_losses += awayGameWins;
      away.game_wins += awayGameWins;
      away.game_losses += homeGameWins;
      home.points_for += homePoints;
      home.points_against += awayPoints;
      away.points_for += awayPoints;
      away.points_against += homePoints;

      if (winningTeamId === matchRow.home_team_id) {
        home.line_wins += 1;
        away.line_losses += 1;
      } else if (winningTeamId === matchRow.away_team_id) {
        away.line_wins += 1;
        home.line_losses += 1;
      } else {
        home.line_ties += 1;
        away.line_ties += 1;
      }

      const points = lineStandingsPoints(line, winningTeamId, matchRow);
      homeTeamWinPoints += points.home;
      awayTeamWinPoints += points.away;
    });

    const matchWinningTeamId =
      homeTeamWinPoints > awayTeamWinPoints
        ? matchRow.home_team_id
        : awayTeamWinPoints > homeTeamWinPoints
        ? matchRow.away_team_id
        : null;

    home.matches_played += 1;
    away.matches_played += 1;
    home.standings_points += homeTeamWinPoints;
    away.standings_points += awayTeamWinPoints;

    if (matchWinningTeamId === matchRow.home_team_id) {
      home.match_wins += 1;
      away.match_losses += 1;
      home.home_wins += 1;
      away.away_losses += 1;
      home.recentResults.push("W");
      away.recentResults.push("L");
    } else if (matchWinningTeamId === matchRow.away_team_id) {
      away.match_wins += 1;
      home.match_losses += 1;
      away.away_wins += 1;
      home.home_losses += 1;
      away.recentResults.push("W");
      home.recentResults.push("L");
    } else {
      home.match_ties += 1;
      away.match_ties += 1;
      home.recentResults.push("T");
      away.recentResults.push("T");
    }

    for (const line of matchRow.match_lines || []) {
      const { error: lineError } = await supabase
        .from("match_lines")
        .update({
          winning_team_id: line.rebuilt.winningTeamId,
          home_team_games_won: line.rebuilt.homeGameWins,
          away_team_games_won: line.rebuilt.awayGameWins,
          home_team_points: line.rebuilt.homePoints,
          away_team_points: line.rebuilt.awayPoints,
          line_status: line.rebuilt.winningTeamId ? "completed" : "scheduled",
          updated_at: new Date().toISOString(),
        })
        .eq("id", line.id);

      if (lineError) return { success: false, error: lineError.message };
    }

    const { error: matchUpdateError } = await supabase
      .from("matches")
      .update({
        home_score: homeTeamWinPoints,
        away_score: awayTeamWinPoints,
        winning_team_id: matchWinningTeamId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", matchRow.id);

    if (matchUpdateError) return { success: false, error: matchUpdateError.message };
  }

  const finalByeAdjustment = applyFinalByeAdjustments(
    Object.values(standingsMap).map((team) => {
      team.point_differential = team.points_for - team.points_against;
      return applyRecentFields(team);
    }),
    divisionByes || [],
    publishedMatches || []
  );

  const ordered = sortStandingsRows(
    finalByeAdjustment.rows,
    division
  );

  ordered.forEach((team, index) => {
    team.rank = index + 1;
    team.updated_at = new Date().toISOString();
    delete team.team_name;
  });

  const { error: deleteError } = await supabase
    .from("team_standings")
    .delete()
    .eq("division_id", divisionId);

  if (deleteError) return { success: false, error: deleteError.message };

  if (ordered.length > 0) {
    const { error: insertError } = await supabase.from("team_standings").insert(ordered);
    if (insertError) return { success: false, error: insertError.message };
  }

  return {
    success: true,
    teams: ordered.length,
    matches: (verifiedMatches || []).length,
    byeAdjustmentApplied: finalByeAdjustment.applied,
  };
}
