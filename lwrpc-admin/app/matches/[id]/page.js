"use client";

import LoadingScreen from "../../components/LoadingScreen";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AppHeader from "../../components/AppHeader";
import { requireRole, supabase } from "../../lib/auth";
import { formatDisplayDate, formatDisplayTime } from "../../lib/dateTime";
import { splitNotificationRecipients } from "../../lib/notificationPreferences";
import { hasRole } from "../../lib/permissions";

export default function MatchDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  const [match, setMatch] = useState(null);
  const [lines, setLines] = useState([]);
  const [games, setGames] = useState([]);
  const [homeRoster, setHomeRoster] = useState([]);
  const [awayRoster, setAwayRoster] = useState([]);
  const [seasonRatings, setSeasonRatings] = useState([]);
  const [currentUserMember, setCurrentUserMember] = useState(null);
  const [currentUserRole, setCurrentUserRole] = useState("player");
  const [matchLineups, setMatchLineups] = useState([]);

  const checkAuth = useCallback(async function checkAuth() {
    const user = await requireRole(router, "captain");
    if (user?.role) setCurrentUserRole(user.role);
    return !!user;
  }, [router]);

  const loadData = useCallback(async function loadData() {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user?.email) {
      const { data: memberData } = await supabase
        .from("members")
        .select("*")
        .eq("email", user.email)
        .maybeSingle();

      setCurrentUserMember(memberData || null);
    }

    const { data: matchData, error: matchError } = await supabase
      .from("matches")
      .select(`
        *,
        leagues(id, name, season_id),
        divisions(name, number_of_lines, games_per_line, rating_type, team_dupr_max),
        locations(name),
        home_team:teams!matches_home_team_id_fkey(
          id,
          name,
          captain_member_id,
          co_captain_member_id,
          co_captain_2_member_id
        ),
        away_team:teams!matches_away_team_id_fkey(
          id,
          name,
          captain_member_id,
          co_captain_member_id,
          co_captain_2_member_id
        ),
        winning_team:teams!matches_winning_team_id_fkey(id, name)
      `)
      .eq("id", id)
      .single();

    if (matchError) {
      alert(matchError.message);
      setLoading(false);
      return;
    }

    const { data: lineData, error: lineError } = await supabase
      .from("match_lines")
      .select(`
        *,
        winning_team:teams!match_lines_winning_team_id_fkey(id, name),
        division_lines (
          id,
          line_name,
          line_number,
          line_type,
          game_format,
          games_per_line,
          points_to_win,
          posted_to_dupr,
          uses_saved_match_lineups
        ),
        home_player_1:members!match_lines_home_player_1_id_fkey(id, first_name, last_name),
        home_player_2:members!match_lines_home_player_2_id_fkey(id, first_name, last_name),
        away_player_1:members!match_lines_away_player_1_id_fkey(id, first_name, last_name),
        away_player_2:members!match_lines_away_player_2_id_fkey(id, first_name, last_name)
      `)
      .eq("match_id", id)
      .order("line_number", { ascending: true });

    if (lineError) {
      alert(lineError.message);
      setLoading(false);
      return;
    }

    const { data: homeRosterData, error: homeRosterError } = await supabase
      .from("team_members")
      .select("*, members(id, first_name, last_name, self_rating, dupr_id)")
      .eq("team_id", matchData.home_team_id)
      .order("members(last_name)", { ascending: true });

    if (homeRosterError) {
      alert(homeRosterError.message);
      setLoading(false);
      return;
    }

    const { data: awayRosterData, error: awayRosterError } = await supabase
      .from("team_members")
      .select("*, members(id, first_name, last_name, self_rating, dupr_id)")
      .eq("team_id", matchData.away_team_id)
      .order("members(last_name)", { ascending: true });

    if (awayRosterError) {
      alert(awayRosterError.message);
      setLoading(false);
      return;
    }

    const lineIds = (lineData || []).map((line) => line.id);
    let gameData = [];

    if (lineIds.length > 0) {
      const { data, error } = await supabase
        .from("line_games")
        .select("*")
        .in("match_line_id", lineIds)
        .order("game_number", { ascending: true });

      if (error) {
        alert(error.message);
        setLoading(false);
        return;
      }

      gameData = data || [];
    }

    let createdMissingGames = false;

    for (const line of lineData || []) {
      const existingGames = gameData.filter((game) => game.match_line_id === line.id);

      if (existingGames.length === 0) {
        const numberOfGames = Number(
          line.division_lines?.games_per_line || matchData.divisions?.games_per_line || 1
        );

        const rows = [];

        for (let i = 1; i <= numberOfGames; i++) {
          rows.push({
            match_line_id: line.id,
            game_number: i,
            game_status: "scheduled",
          });
        }

        const { error } = await supabase.from("line_games").insert(rows);

        if (error) {
          alert(error.message);
          setLoading(false);
          return;
        }

        createdMissingGames = true;
      }
    }

    if (createdMissingGames && lineIds.length > 0) {
      const { data, error } = await supabase
        .from("line_games")
        .select("*")
        .in("match_line_id", lineIds)
        .order("game_number", { ascending: true });

      if (error) {
        alert(error.message);
        setLoading(false);
        return;
      }

      gameData = data || [];
    }

    const { data: lineupData, error: lineupError } = await supabase
      .from("match_lineups")
      .select(`
        *,
        player_1:members!match_lineups_player_1_member_id_fkey(id, first_name, last_name),
        player_2:members!match_lineups_player_2_member_id_fkey(id, first_name, last_name)
      `)
      .eq("match_id", id)
      .order("line_number", { ascending: true });

    if (lineupError) {
      alert("Saved match teams require the match_lineups schema update. Run the updated Supabase SQL, then try again.");
      setLoading(false);
      return;
    }

    let ratingData = [];
    const seasonId = matchData.leagues?.season_id;

    if (seasonId) {
      const { data, error } = await supabase
        .from("member_season_ratings")
        .select("*")
        .eq("season_id", seasonId);

      if (error) {
        alert(error.message);
        setLoading(false);
        return;
      }

      ratingData = data || [];
    }

    setMatch(matchData);
    setLines(lineData || []);
    setHomeRoster(homeRosterData || []);
    setAwayRoster(awayRosterData || []);
    setSeasonRatings(ratingData);
    setMatchLineups(lineupData || []);
    setGames(gameData);
    setLoading(false);
  }, [id]);

  function rosterOptionName(row) {
    const member = row.members;
    if (!member) return "Unknown Player";
    return `${member.last_name || ""}, ${member.first_name || ""}`.trim();
  }


  function ratingLabel() {
    const ratingType = match?.divisions?.rating_type || "dupr";
    if (ratingType === "primetime") return "PT";
    if (ratingType === "self_rating") return "Self";
    return "DUPR";
  }

  function memberRating(member) {
    if (!member) return null;

    const ratingType = match?.divisions?.rating_type || "dupr";
    const ratingRow = seasonRatings.find((rating) => rating.member_id === member.id);

    if (ratingType === "primetime") return ratingRow?.season_primetime_rating ?? null;
    if (ratingType === "self_rating") return member.self_rating ?? null;
    return ratingRow?.season_dupr_rating ?? null;
  }

  function rosterOptionLabel(row) {
    const rating = memberRating(row.members);
    const ratingText =
      rating === null || rating === undefined || rating === ""
        ? "NR"
        : Number(rating).toFixed(2);

    return `${rosterOptionName(row)} (${ratingLabel()}: ${ratingText})`;
  }

  function teamDuprRating(player1, player2) {
    const value = teamDuprRatingValue(player1, player2);

    if (value === null) return "NR";

    return value.toFixed(2);
  }

  function teamDuprRatingValue(player1, player2) {
    const ratings = [memberRating(player1), memberRating(player2)]
      .map((rating) => Number(rating))
      .filter((rating) => !Number.isNaN(rating));

    if (ratings.length === 0) return null;

    return ratings.reduce((sum, rating) => sum + rating, 0);
  }
  function teamSlotNumber(line) {
    return Number(line.division_lines?.line_number || line.line_number || 0);
  }

  function teamSlotLabel(line) {
    const slot = teamSlotNumber(line);
    return `Game ${slot || "-"}`;
  }

  function formatLineInfo(line, lineGames) {
    const divisionLine = line.division_lines;
    const pieces = [
      capitalizeFirst(divisionLine?.line_type),
      capitalizeFirst(divisionLine?.game_format),
      `${lineGames.length || divisionLine?.games_per_line || 1} game(s)`,
    ].filter(Boolean);

    return pieces.join(" - ");
  }

  const getDisplayedLines = useCallback(function getDisplayedLines(allLines) {
    const seen = new Set();

    return [...allLines]
      .sort((a, b) => teamSlotNumber(a) - teamSlotNumber(b))
      .filter((line) => {
        const slot = teamSlotNumber(line);

        const key = line.division_line_id || `slot-${slot}`;

        if (seen.has(key)) {
          return false;
        }

        seen.add(key);
        return true;
      });
  }, []);

  const displayedLines = useMemo(() => getDisplayedLines(lines), [getDisplayedLines, lines]);

  const getLineSummary = useCallback(function getLineSummary(line) {
    const lineGames = games.filter((game) => game.match_line_id === line.id);

    let homeGameWins = 0;
    let awayGameWins = 0;
    let homePoints = 0;
    let awayPoints = 0;

    lineGames.forEach((game) => {
      if (game.game_status === "forfeit_home" || game.game_status === "retired_home") {
        homeGameWins++;
        return;
      }

      if (game.game_status === "forfeit_away" || game.game_status === "retired_away") {
        awayGameWins++;
        return;
      }

      if (game.home_score !== null && game.away_score !== null) {
        homePoints += Number(game.home_score || 0);
        awayPoints += Number(game.away_score || 0);

        if (game.home_score > game.away_score) homeGameWins++;
        if (game.away_score > game.home_score) awayGameWins++;
      }
    });

    let winningTeamId = null;
    let winnerName = "-";

    if (homeGameWins > awayGameWins) {
      winningTeamId = match?.home_team_id;
      winnerName = match?.home_team?.name || "Home";
    }

    if (awayGameWins > homeGameWins) {
      winningTeamId = match?.away_team_id;
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
  }, [games, match]);

  const playerAssignmentCounts = useMemo(() => {
    const counts = {};

    displayedLines.forEach((line) => {
      [
        line.home_player_1_id,
        line.home_player_2_id,
        line.away_player_1_id,
        line.away_player_2_id,
      ]
        .filter(Boolean)
        .forEach((playerId) => {
          counts[playerId] = (counts[playerId] || 0) + 1;
        });
    });

    return counts;
  }, [displayedLines]);

  const sameGameDuplicateLineIds = useMemo(() => {
    return displayedLines
      .filter((line) => {
        const playerIds = [
          line.home_player_1_id,
          line.home_player_2_id,
          line.away_player_1_id,
          line.away_player_2_id,
        ].filter(Boolean);

        return new Set(playerIds).size < playerIds.length;
      })
      .map((line) => line.id);
  }, [displayedLines]);

  const overLineLimitPlayerIds = useMemo(() => {
    const lineLimit = Number(match?.divisions?.number_of_lines || 0);
    if (lineLimit <= 0) return [];

    return Object.keys(playerAssignmentCounts).filter(
      (playerId) => playerAssignmentCounts[playerId] > lineLimit
    );
  }, [playerAssignmentCounts, match]);

  function lineWarnings(line) {
    const warnings = [];
    const doublesMax = match?.divisions?.team_dupr_max;

    if (sameGameDuplicateLineIds.includes(line.id)) {
      warnings.push("A player is selected twice in this game.");
    }

    const overLimitNames = [
      line.home_player_1,
      line.home_player_2,
      line.away_player_1,
      line.away_player_2,
    ]
      .filter((player) => overLineLimitPlayerIds.includes(player?.id))
      .map((player) => `${player.first_name || ""} ${player.last_name || ""}`.trim())
      .filter(Boolean);

    if (overLimitNames.length > 0) {
      warnings.push(
        `${[...new Set(overLimitNames)].join(", ")} selected more than the division allows.`
      );
    }

    if (doublesMax !== null && doublesMax !== undefined && doublesMax !== "") {
      const homeRating = teamDuprRatingValue(line.home_player_1, line.home_player_2);
      const awayRating = teamDuprRatingValue(line.away_player_1, line.away_player_2);

      if (homeRating !== null && homeRating > Number(doublesMax)) {
        warnings.push(`${match?.home_team?.name || "Home"} doubles team is over the ${ratingLabel()} maximum of ${Number(doublesMax).toFixed(2)}.`);
      }

      if (awayRating !== null && awayRating > Number(doublesMax)) {
        warnings.push(`${match?.away_team?.name || "Away"} doubles team is over the ${ratingLabel()} maximum of ${Number(doublesMax).toFixed(2)}.`);
      }
    }

    return warnings;
  }

  const matchSummary = useMemo(() => {
    let homeWins = 0;
    let awayWins = 0;

    displayedLines.forEach((line) => {
      const summary = getLineSummary(line);

      if (summary.winningTeamId === match?.home_team_id) homeWins++;
      if (summary.winningTeamId === match?.away_team_id) awayWins++;
    });

    let winningTeamId = null;
    let winnerName = "-";

    if (homeWins > awayWins) {
      winningTeamId = match?.home_team_id;
      winnerName = match?.home_team?.name || "Home";
    }

    if (awayWins > homeWins) {
      winningTeamId = match?.away_team_id;
      winnerName = match?.away_team?.name || "Away";
    }

    return {
      homeWins,
      awayWins,
      winningTeamId,
      winnerName,
    };
  }, [displayedLines, getLineSummary, match]);

  async function updateLinePlayer(lineId, field, value) {
    const selectedLine = lines.find((line) => line.id === lineId);

    if (!selectedLine) return;

    const selectedSlot = teamSlotNumber(selectedLine);
    const selectedDivisionLineId = selectedLine.division_line_id;

    const matchingBlankLines = lines.filter((line) => {
      const sameTeamSlot =
        line.id === selectedLine.id ||
        (selectedDivisionLineId && line.division_line_id === selectedDivisionLineId) ||
        teamSlotNumber(line) === selectedSlot;

      return sameTeamSlot && !line[field];
    });

    const lineIdsToUpdate = matchingBlankLines.map((line) => line.id);

    if (!lineIdsToUpdate.includes(lineId)) {
      lineIdsToUpdate.push(lineId);
    }

    const { error } = await supabase
      .from("match_lines")
      .update({
        [field]: value || null,
        updated_at: new Date().toISOString(),
      })
      .in("id", lineIdsToUpdate);

    if (error) {
      alert(error.message);
      return;
    }

    const roster = field.startsWith("home_") ? homeRoster : awayRoster;
    const selectedMember = roster.find((row) => String(row.members?.id) === String(value))?.members || null;
    const playerObjectField = field.replace(/_id$/, "");

    setLines((currentLines) =>
      currentLines.map((line) =>
        lineIdsToUpdate.includes(line.id)
          ? {
              ...line,
              [field]: value || null,
              [playerObjectField]: selectedMember,
            }
          : line
      )
    );
  }

  async function applySavedLineup(line, side, lineupId) {
    if (!lineupId) return;

    const lineup = matchLineups.find((item) => item.id === lineupId);
    if (!lineup) return;

    const player1Field = side === "home" ? "home_player_1_id" : "away_player_1_id";
    const player2Field = side === "home" ? "home_player_2_id" : "away_player_2_id";
    const roster = side === "home" ? homeRoster : awayRoster;
    const player1 = roster.find((row) => String(row.members?.id) === String(lineup.player_1_member_id))?.members || lineup.player_1 || null;
    const player2 = roster.find((row) => String(row.members?.id) === String(lineup.player_2_member_id))?.members || lineup.player_2 || null;

    const { error } = await supabase
      .from("match_lines")
      .update({
        [player1Field]: lineup.player_1_member_id || null,
        [player2Field]: lineup.player_2_member_id || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", line.id);

    if (error) {
      alert(error.message);
      return;
    }

    setLines((currentLines) =>
      currentLines.map((row) =>
        row.id === line.id
          ? {
              ...row,
              [player1Field]: lineup.player_1_member_id || null,
              [player2Field]: lineup.player_2_member_id || null,
              [player1Field.replace(/_id$/, "")]: player1,
              [player2Field.replace(/_id$/, "")]: player2,
            }
          : row
      )
    );
  }

  async function updateGame(gameId, field, value) {
    const game = games.find((item) => item.id === gameId);
    const line = lines.find((item) => item.id === game?.match_line_id);

    if ((field === "home_score" || field === "away_score") && line && lineHasBlockingRatingWarning(line)) {
      alert("This game line has a team over the division rating maximum. Fix the players before entering scores for this line.");
      return;
    }

    const normalizedValue =
      field === "game_status" ? value || "completed" : value === "" ? null : Number(value);

    setGames((currentGames) =>
      currentGames.map((game) =>
        game.id === gameId
          ? {
              ...game,
              [field]: normalizedValue,
            }
          : game
      )
    );

    const { error } = await supabase
      .from("line_games")
      .update({
        [field]: normalizedValue,
        updated_at: new Date().toISOString(),
      })
      .eq("id", gameId);

    if (error) {
      alert(error.message);
      loadData();
    }
  }

  function gameStatusOptions() {
    return [
      { value: "completed", label: "Completed" },
      { value: "forfeit_home", label: `Forfeited to ${match?.home_team?.name || "Home"}` },
      { value: "forfeit_away", label: `Forfeited to ${match?.away_team?.name || "Away"}` },
      { value: "retired_home", label: `Retired to ${match?.home_team?.name || "Home"}` },
      { value: "retired_away", label: `Retired to ${match?.away_team?.name || "Away"}` },
    ];
  }

  function gameWinnerName(game) {
    if (game.game_status === "forfeit_home" || game.game_status === "retired_home") {
      return match?.home_team?.name || "Home";
    }

    if (game.game_status === "forfeit_away" || game.game_status === "retired_away") {
      return match?.away_team?.name || "Away";
    }

    if (game.home_score !== null && game.away_score !== null) {
      if (game.home_score > game.away_score) return match?.home_team?.name || "Home";
      if (game.away_score > game.home_score) return match?.away_team?.name || "Away";
    }

    return "-";
  }

  function isCaptainView() {
    const memberId = currentUserMember?.id;
    if (!memberId || !match) return false;

    return [
      match.home_team?.captain_member_id,
      match.home_team?.co_captain_member_id,
      match.home_team?.co_captain_2_member_id,
      match.away_team?.captain_member_id,
      match.away_team?.co_captain_member_id,
      match.away_team?.co_captain_2_member_id,
    ].some((captainId) => String(captainId) === String(memberId));
  }

  function canManageScores() {
    return isCaptainView() || hasRole(currentUserRole, "league_manager");
  }

  function isManagerOverride() {
    return hasRole(currentUserRole, "league_manager");
  }

  function lineHasBlockingRatingWarning(line) {
    const doublesMax = match?.divisions?.team_dupr_max;
    if (doublesMax === null || doublesMax === undefined || doublesMax === "") return false;

    const homeRating = teamDuprRatingValue(line.home_player_1, line.home_player_2);
    const awayRating = teamDuprRatingValue(line.away_player_1, line.away_player_2);

    return (
      (homeRating !== null && homeRating > Number(doublesMax)) ||
      (awayRating !== null && awayRating > Number(doublesMax))
    );
  }

  function isForfeitStatus(status) {
    return status === "forfeit_home" || status === "forfeit_away";
  }

  function isRetiredStatus(status) {
    return status === "retired_home" || status === "retired_away";
  }

  function linePlayerIds(line) {
    return [
      line.home_player_1_id,
      line.home_player_2_id,
      line.away_player_1_id,
      line.away_player_2_id,
    ];
  }

  function gameLineValidationIssues(line, lineGames) {
    const issues = [];
    const pointsToWin = Number(line.division_lines?.points_to_win || 0);

    if (lineWarnings(line).length > 0) {
      issues.push(...lineWarnings(line));
    }

    lineGames.forEach((game) => {
      const status = game.game_status && game.game_status !== "scheduled" ? game.game_status : "completed";
      const gameLabel = `${teamSlotLabel(line)} Game ${game.game_number || ""}`.trim();

      if (isForfeitStatus(status)) return;

      const hasAllPlayers = linePlayerIds(line).every(Boolean);

      if (!hasAllPlayers) {
        issues.push(`${gameLabel}: all players are required unless the result is a forfeit.`);
      }

      if (game.home_score === null || game.home_score === undefined || game.away_score === null || game.away_score === undefined) {
        issues.push(`${gameLabel}: both scores are required unless the result is a forfeit.`);
        return;
      }

      if (!isRetiredStatus(status) && pointsToWin > 0) {
        const highScore = Math.max(Number(game.home_score || 0), Number(game.away_score || 0));
        if (highScore < pointsToWin) {
          issues.push(`${gameLabel}: at least one score must be ${pointsToWin} or higher for a completed game.`);
        }
      }
    });

    return issues;
  }

  function scoreValidationIssues() {
    return displayedLines.flatMap((line) =>
      gameLineValidationIssues(
        line,
        games.filter((game) => game.match_line_id === line.id)
      )
    );
  }

  async function saveCalculatedWinners(showAlert = true) {
    if (!canManageScores()) {
      alert("Only captains for this match can enter or verify scores.");
      return false;
    }

    const issues = scoreValidationIssues();

    if (issues.length > 0) {
      alert(["Scores cannot be saved yet.", "", ...issues.map((issue) => `- ${issue}`)].join("\n"));
      return false;
    }

    for (const line of displayedLines) {
      const summary = getLineSummary(line);
      const lineStatus = summary.winningTeamId ? "completed" : "scheduled";

      const { error } = await supabase
        .from("match_lines")
        .update({
          winning_team_id: summary.winningTeamId,
          home_team_games_won: summary.homeGameWins,
          away_team_games_won: summary.awayGameWins,
          home_team_points: summary.homePoints,
          away_team_points: summary.awayPoints,
          line_status: lineStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", line.id);

      if (error) {
        alert(error.message);
        return false;
      }
    }

    const { error: matchError } = await supabase
      .from("matches")
      .update({
        home_score: matchSummary.homeWins,
        away_score: matchSummary.awayWins,
        winning_team_id: matchSummary.winningTeamId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (matchError) {
      alert(matchError.message);
      return false;
    }

    if (showAlert) {
      alert("Winners saved.");
      loadData();
    }

    return true;
  }

  async function completeMatch() {
    if (!canManageScores()) {
      alert("Only captains for this match can enter scores.");
      return;
    }

    if (match.score_status === "pending_verification") {
      if (!confirm("Scores have already been submitted for verification. Save changes and resubmit?")) return;
    }

    const issues = scoreValidationIssues();
    if (issues.length > 0) {
      alert(["Scores cannot be submitted yet.", "", ...issues.map((issue) => `- ${issue}`)].join("\n"));
      return;
    }

    const saved = await saveCalculatedWinners(false);

    if (!saved) return;

    const currentMemberId = currentUserMember?.id || null;

    const { error } = await supabase
      .from("matches")
      .update({
        status: "completed",
        score_status: "pending_verification",
        score_entered_by_member_id: currentMemberId,
        score_entered_at: new Date().toISOString(),
        home_score: matchSummary.homeWins,
        away_score: matchSummary.awayWins,
        winning_team_id: matchSummary.winningTeamId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    await rebuildDivisionStandings();
    await sendScoreNotification("submitted");

    alert("Scores submitted, standings updated, and opposing captains notified.");

    loadData();
  }

  async function verifyScores() {
    if (!canManageScores()) {
      alert("Only captains for this match can verify scores.");
      return;
    }

    if (!currentUserMember?.id) {
      alert("Unable to identify current member.");
      return;
    }

    const { error } = await supabase
      .from("matches")
      .update({
        score_status: "verified",
        score_verified_by_member_id: currentUserMember.id,
        score_verified_at: new Date().toISOString(),
        finalized_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    await sendScoreNotification("verified");

    alert("Scores verified.");

    router.push(isCaptainView() ? "/captain-dashboard" : "/schedule-editor");
  }

  async function disputeScores() {
    if (!canManageScores()) {
      alert("Only captains for this match can dispute scores.");
      return;
    }

    const notes = prompt("Enter dispute notes");

    if (notes === null) return;

    const { error } = await supabase
      .from("matches")
      .update({
        score_status: "disputed",
        score_disputed: true,
        score_dispute_notes: notes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    alert("Scores marked as disputed.");

    loadData();
  }

  async function sendScoreNotification(notificationType) {
    try {
      const teamIds = notificationTeamIdsForCurrentUser();

      if (teamIds.length === 0) {
        console.log("No opposing captain team found for score notification.");
        return;
      }

      const { data: teams, error } = await supabase
        .from("teams")
        .select(`
          id,
          captain:members!teams_captain_member_id_fkey (
            id,
            first_name,
            last_name,
            email,
            phone,
            notification_preference
          ),
          co_captain_1:members!teams_co_captain_member_id_fkey (
            id,
            first_name,
            last_name,
            email,
            phone,
            notification_preference
          ),
          co_captain_2:members!teams_co_captain_2_member_id_fkey (
            id,
            first_name,
            last_name,
            email,
            phone,
            notification_preference
          )
        `)
        .in("id", teamIds);

      if (error) {
        console.error(error);
        return;
      }

      const { emails, phones } = splitNotificationRecipients(
        (teams || []).flatMap((team) => [
          team?.captain,
          team?.co_captain_1,
          team?.co_captain_2,
        ])
      );

      if (emails.length === 0 && phones.length === 0) {
        console.log("No opposing captain emails or phone numbers found.");
        return;
      }

      await fetch("/api/score-notification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          emails,
          phones,
          homeTeam: match.home_team?.name,
          awayTeam: match.away_team?.name,
          score: `${matchSummary.homeWins}-${matchSummary.awayWins}`,
          matchDate: match.scheduled_date,
          enteredBy: currentUserMember
            ? `${currentUserMember.first_name} ${currentUserMember.last_name}`
            : "Unknown",
          notificationType,
        }),
      });
    } catch (err) {
      console.error("Score notification send failed", err);
    }
  }

  function notificationTeamIdsForCurrentUser() {
    const memberId = currentUserMember?.id;
    const homeCaptainIds = [
      match.home_team?.captain_member_id,
      match.home_team?.co_captain_member_id,
      match.home_team?.co_captain_2_member_id,
    ].filter(Boolean);
    const awayCaptainIds = [
      match.away_team?.captain_member_id,
      match.away_team?.co_captain_member_id,
      match.away_team?.co_captain_2_member_id,
    ].filter(Boolean);

    if (memberId && homeCaptainIds.some((captainId) => String(captainId) === String(memberId))) {
      return [match.away_team_id].filter(Boolean);
    }

    if (memberId && awayCaptainIds.some((captainId) => String(captainId) === String(memberId))) {
      return [match.home_team_id].filter(Boolean);
    }

    if (hasRole(currentUserRole, "league_manager")) {
      return [match.home_team_id, match.away_team_id].filter(Boolean);
    }

    return [];
  }

  async function rebuildDivisionStandings() {
    if (!match?.division_id) return;

    const { data: division, error: divisionError } = await supabase
      .from("divisions")
      .select("*")
      .eq("id", match.division_id)
      .single();

    if (divisionError) {
      alert(divisionError.message);
      return;
    }

    const { data: completedMatches, error } = await supabase
      .from("matches")
      .select(`
        *,
        match_lines (
          *,
          winning_team_id,
          home_team_games_won,
          away_team_games_won,
          home_team_points,
          away_team_points,
          division_lines (
            team_win_points
          )
        )
      `)
      .eq("division_id", match.division_id)
      .eq("status", "completed")
      .order("scheduled_date", { ascending: true });

    if (error) {
      alert(error.message);
      return;
    }

    const standingsMap = {};

    function ensureTeam(teamId) {
      if (!standingsMap[teamId]) {
        standingsMap[teamId] = {
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

      return standingsMap[teamId];
    }

    completedMatches.forEach((matchRow) => {
      const home = ensureTeam(matchRow.home_team_id);
      const away = ensureTeam(matchRow.away_team_id);

      home.matches_played += 1;
      away.matches_played += 1;

      let homeLinesWon = 0;
      let awayLinesWon = 0;

      (matchRow.match_lines || []).forEach((line) => {
        const hg = Number(line.home_team_games_won || 0);
        const ag = Number(line.away_team_games_won || 0);
        const hp = Number(line.home_team_points || 0);
        const ap = Number(line.away_team_points || 0);

        home.game_wins += hg;
        home.game_losses += ag;
        away.game_wins += ag;
        away.game_losses += hg;
        home.points_for += hp;
        home.points_against += ap;
        away.points_for += ap;
        away.points_against += hp;

        if (line.winning_team_id === matchRow.home_team_id) {
          home.line_wins += 1;
          away.line_losses += 1;
          homeLinesWon += 1;
        } else if (line.winning_team_id === matchRow.away_team_id) {
          away.line_wins += 1;
          home.line_losses += 1;
          awayLinesWon += 1;
        } else {
          home.line_ties += 1;
          away.line_ties += 1;
        }

        const teamWinPoints = Number(line.division_lines?.team_win_points ?? 1);
        home.standings_points += hg * teamWinPoints;
        away.standings_points += ag * teamWinPoints;
      });

      if (homeLinesWon > awayLinesWon) {
        home.match_wins += 1;
        away.match_losses += 1;
        home.home_wins += 1;
        away.away_losses += 1;
        home.recentResults.push("W");
        away.recentResults.push("L");
      } else if (awayLinesWon > homeLinesWon) {
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
    });

    const ordered = Object.values(standingsMap).map((team) => {
      team.point_differential = team.points_for - team.points_against;
      const recent = team.recentResults.slice(-5);
      team.recent_form = recent.join("");

      if (recent.length > 0) {
        const last = recent[recent.length - 1];
        let streak = 0;

        for (let i = recent.length - 1; i >= 0; i--) {
          if (recent[i] === last) {
            streak++;
          } else {
            break;
          }
        }

        team.current_streak = last + streak;
      } else {
        team.current_streak = "-";
      }

      delete team.recentResults;
      return team;
    });

    ordered.sort((a, b) => {
      const rules = [
        division.standings_tiebreak_1,
        division.standings_tiebreak_2,
        division.standings_tiebreak_3,
      ];

      for (const rule of rules) {
        if ((b[rule] || 0) !== (a[rule] || 0)) {
          return (b[rule] || 0) - (a[rule] || 0);
        }
      }

      return 0;
    });

    ordered.forEach((team, index) => {
      team.rank = index + 1;
      team.updated_at = new Date().toISOString();
    });

    await supabase.from("team_standings").delete().eq("division_id", match.division_id);

    if (ordered.length > 0) {
      const { error: insertError } = await supabase.from("team_standings").insert(ordered);

      if (insertError) {
        alert(insertError.message);
      }
    }
  }

  useEffect(() => {
    async function run() {
      const ok = await checkAuth();

      if (ok && id) {
        loadData();
      }
    }

    run();
  }, [checkAuth, id, loadData]);

  if (loading || !match) {
    return <LoadingScreen subtitle="Loading Match Operations..." />;
  }

  const scoreActionsAllowed = canManageScores();
  const scoreEntryEditable =
    scoreActionsAllowed &&
    (isManagerOverride() || match.score_status !== "verified");

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-6">
      <div className="mx-auto max-w-7xl">
        <AppHeader
          title="Enter Match Scores"
          subtitle="Assign players by team, enter game scores, and submit final results."
        />

        <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:flex lg:flex-wrap lg:gap-3">
          <button
            type="button"
            onClick={() => router.push(isCaptainView() ? "/captain-dashboard" : "/schedule-editor")}
            className="rounded-xl bg-slate-200 px-4 py-3 font-semibold hover:bg-slate-300 lg:py-2"
          >
            Back to {isCaptainView() ? "Captain Dashboard" : "Schedule Editor"}
          </button>

          <button
            type="button"
            onClick={completeMatch}
            disabled={!scoreEntryEditable}
            className="rounded-xl bg-green-700 px-4 py-3 font-semibold text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:bg-slate-300 lg:py-2"
          >
            Submit Scores
          </button>

          {match.score_status === "pending_verification" && (
            <>
              <button
                type="button"
                onClick={verifyScores}
                disabled={!scoreActionsAllowed}
                className="rounded-xl bg-emerald-700 px-4 py-3 font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300 lg:py-2"
              >
                Validate Scores
              </button>

              <button
                type="button"
                onClick={disputeScores}
                disabled={!scoreActionsAllowed}
                className="rounded-xl bg-red-700 px-4 py-3 font-semibold text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:bg-slate-300 lg:py-2"
              >
                Dispute Scores
              </button>
            </>
          )}
        </div>

        {match.score_status === "pending_verification" && (
          <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-950">
            <div className="font-black">Score Verification Mode</div>
            <div className="mt-1 text-sm">
              Captains may still correct scores until they are validated. Use Validate Scores when the final review is complete.
            </div>
          </div>
        )}

        {(sameGameDuplicateLineIds.length > 0 || overLineLimitPlayerIds.length > 0) && (
          <div className="mb-4 rounded-2xl border-2 border-red-600 bg-red-100 p-4 text-red-950 shadow">
            <div className="text-lg font-black uppercase tracking-wide">Duplicate Player Warning</div>
            {sameGameDuplicateLineIds.length > 0 && (
              <div className="mt-1 font-semibold">
                A player is selected twice in the same game.
              </div>
            )}
            {overLineLimitPlayerIds.length > 0 && (
              <div className="mt-1 font-semibold">
                A player is selected more than the {match.divisions?.number_of_lines || "configured"} game line(s) allowed for this division.
              </div>
            )}
          </div>
        )}

        {lines.length > displayedLines.length && (
      <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
            This match has duplicate old score sections from a previous setup. For a fully clean match, delete and regenerate the schedule.
          </div>
        )}

        <div className="rounded-2xl bg-white p-4 shadow md:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">
                {match.home_team?.name || "Home"} vs {match.away_team?.name || "Away"}
              </h1>

              <div className="mt-2 text-sm text-slate-600 md:text-base">
                {match.leagues?.name || "No League"} - {match.divisions?.name || "No Division"}
              </div>

              <div className="mt-1 text-sm text-slate-600 md:text-base">
                {formatDisplayDate(match.scheduled_date, "No Date")} - {formatDisplayTime(match.scheduled_time, "No Time")} - {match.locations?.name || "No Location"}
              </div>

              <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-wide">
                <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">
                  Status: {match.status || "scheduled"}
                </span>
                <span className="rounded-full bg-blue-100 px-3 py-1 text-blue-900">
                  Score: {match.score_status || "not_entered"}
                </span>
                <span className="rounded-full bg-green-100 px-3 py-1 text-green-900">
                  Winner: {matchSummary.winnerName}
                </span>
              </div>

              {match.score_disputed && (
                <div className="mt-3 rounded-xl bg-red-50 p-3 text-red-900">
                  <div className="font-bold">Score Dispute</div>
                  <div className="mt-1 text-sm">{match.score_dispute_notes}</div>
                </div>
              )}
            </div>

            <div className="w-full rounded-2xl bg-slate-900 p-5 text-white shadow-lg lg:w-auto">
              <div className="text-xs uppercase tracking-wide text-slate-300">Match Score</div>
              <div className="mt-1 text-4xl font-bold">
                {matchSummary.homeWins} - {matchSummary.awayWins}
              </div>
              <div className="mt-2 text-sm text-slate-300">Winner: {matchSummary.winnerName}</div>
            </div>
          </div>

          {match.notes && (
            <div className="mt-4 rounded-xl bg-amber-50 p-3 text-amber-900">
              <div className="font-semibold">Match Notes</div>
              <div className="mt-1 text-sm">{match.notes}</div>
            </div>
          )}
        </div>

        <div className="mt-4 space-y-4">
          {displayedLines.map((line) => {
            const divisionLine = line.division_lines;
            const lineGames = games.filter((game) => game.match_line_id === line.id);
            const lineSummary = getLineSummary(line);
            const warnings = lineWarnings(line);
            const scoresBlockedForLine = lineHasBlockingRatingWarning(line);

            const hasDuplicate =
              sameGameDuplicateLineIds.includes(line.id) ||
              overLineLimitPlayerIds.includes(line.home_player_1_id) ||
              overLineLimitPlayerIds.includes(line.home_player_2_id) ||
              overLineLimitPlayerIds.includes(line.away_player_1_id) ||
              overLineLimitPlayerIds.includes(line.away_player_2_id);

            return (
              <div
                key={line.id}
                className={`rounded-2xl p-4 shadow transition-all ${
                  hasDuplicate ? "border border-red-200 bg-red-50" : "bg-white"
                }`}
              >
                <div className="flex flex-col gap-1">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">
                      {teamSlotLabel(line)}
                      {divisionLine?.line_name ? ` - ${divisionLine.line_name}` : ""}
                    </h2>

                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-slate-600">
                      <span>{formatLineInfo(line, lineGames)}</span>
                      <span className="font-semibold text-slate-800">
                        Score: {lineSummary.homeGameWins} - {lineSummary.awayGameWins}
                      </span>
                      <span>
                        Points: {lineSummary.homePoints} - {lineSummary.awayPoints}
                      </span>
                      <span>Winner: {lineSummary.winnerName}</span>
                    </div>

                    {warnings.length > 0 && (
                      <div className="mt-2 rounded-lg border border-red-300 bg-red-100 px-3 py-2 text-sm font-semibold text-red-900">
                        {warnings.map((warning) => (
                          <div key={warning}>{warning}</div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <TeamPlayers
                    title={match.home_team?.name || "Home Team"}
                    teamRating={teamDuprRating(line.home_player_1, line.home_player_2)}
                    ratingLabel={ratingLabel()}
                    savedLineups={matchLineups.filter((lineup) => String(lineup.team_id) === String(match.home_team_id))}
                    useSavedLineups={line.division_lines?.uses_saved_match_lineups !== false}
                    roster={homeRoster}
                    line={line}
                    player1Field="home_player_1_id"
                    player2Field="home_player_2_id"
                    updateLinePlayer={updateLinePlayer}
                    applySavedLineup={(lineupId) => applySavedLineup(line, "home", lineupId)}
                    rosterOptionName={rosterOptionLabel}
                    disabled={!scoreEntryEditable}
                  />

                  <TeamPlayers
                    title={match.away_team?.name || "Away Team"}
                    teamRating={teamDuprRating(line.away_player_1, line.away_player_2)}
                    ratingLabel={ratingLabel()}
                    savedLineups={matchLineups.filter((lineup) => String(lineup.team_id) === String(match.away_team_id))}
                    useSavedLineups={line.division_lines?.uses_saved_match_lineups !== false}
                    roster={awayRoster}
                    line={line}
                    player1Field="away_player_1_id"
                    player2Field="away_player_2_id"
                    updateLinePlayer={updateLinePlayer}
                    applySavedLineup={(lineupId) => applySavedLineup(line, "away", lineupId)}
                    rosterOptionName={rosterOptionLabel}
                    disabled={!scoreEntryEditable}
                  />
                </div>

                <div className="mt-4 space-y-3 md:hidden">
                  {lineGames.map((game) => {
                    const gameWinner = gameWinnerName(game);

                    return (
                      <div key={game.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <div className="mb-3 flex items-center justify-between gap-2">
                          <div className="font-black text-slate-900">Game {game.game_number}</div>
                          <div className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-700">
                            Winner: {gameWinner}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <label className="text-xs font-bold uppercase tracking-wide text-slate-600">
                            {match.home_team?.name || "Home"}
                            <input
                              type="number"
                              value={game.home_score ?? ""}
                              onChange={(e) => updateGame(game.id, "home_score", e.target.value)}
                              disabled={!scoreEntryEditable || scoresBlockedForLine}
                              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-3 text-center text-base font-bold"
                            />
                          </label>

                          <label className="text-xs font-bold uppercase tracking-wide text-slate-600">
                            {match.away_team?.name || "Away"}
                            <input
                              type="number"
                              value={game.away_score ?? ""}
                              onChange={(e) => updateGame(game.id, "away_score", e.target.value)}
                              disabled={!scoreEntryEditable || scoresBlockedForLine}
                              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-3 text-center text-base font-bold"
                            />
                          </label>
                        </div>

                        <select
                          value={game.game_status && game.game_status !== "scheduled" ? game.game_status : "completed"}
                          onChange={(e) => updateGame(game.id, "game_status", e.target.value)}
                          disabled={!scoreEntryEditable}
                          className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-3 text-sm"
                        >
                          {gameStatusOptions().map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  })}

                  {lineGames.length === 0 && (
                    <div className="rounded-xl bg-slate-50 p-4 text-center text-slate-500">
                      No score rows found for this team.
                    </div>
                  )}
                </div>

                <div className="mt-4 hidden overflow-x-auto md:block">
                  <table className="w-full border-collapse text-xs md:text-sm">
                    <thead className="bg-slate-900 text-xs uppercase tracking-wide text-white">
                      <tr>
                        <th className="p-1.5 text-left">Game</th>
                        <th className="p-1.5 text-left">{match.home_team?.name || "Home"}</th>
                        <th className="p-1.5 text-left">{match.away_team?.name || "Away"}</th>
                        <th className="p-1.5 text-left">Result</th>
                        <th className="p-1.5 text-left">Winner</th>
                      </tr>
                    </thead>

                    <tbody>
                      {lineGames.map((game) => {
                        const gameWinner = gameWinnerName(game);

                        return (
                          <tr key={game.id} className="border-b border-slate-100">
                            <td className="p-1.5 font-semibold text-slate-900">
                              Game {game.game_number}
                            </td>

                            <td className="p-1.5">
                              <input
                                type="number"
                                value={game.home_score ?? ""}
                                onChange={(e) => updateGame(game.id, "home_score", e.target.value)}
                                disabled={!scoreEntryEditable || scoresBlockedForLine}
                                className="w-16 rounded-lg border border-slate-300 px-2 py-1.5 text-center font-bold"
                              />
                            </td>

                            <td className="p-1.5">
                              <input
                                type="number"
                                value={game.away_score ?? ""}
                                onChange={(e) => updateGame(game.id, "away_score", e.target.value)}
                                disabled={!scoreEntryEditable || scoresBlockedForLine}
                                className="w-16 rounded-lg border border-slate-300 px-2 py-1.5 text-center font-bold"
                              />
                            </td>

                            <td className="p-1.5">
                              <select
                                value={game.game_status && game.game_status !== "scheduled" ? game.game_status : "completed"}
                                onChange={(e) => updateGame(game.id, "game_status", e.target.value)}
                                disabled={!scoreEntryEditable}
                                className="w-full min-w-40 rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
                              >
                                {gameStatusOptions().map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            </td>

                            <td className="p-1.5 font-semibold text-slate-700">{gameWinner}</td>
                          </tr>
                        );
                      })}

                      {lineGames.length === 0 && (
                        <tr>
                          <td colSpan="5" className="p-4 text-center text-slate-500">
                            No score rows found for this team.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}

          {displayedLines.length === 0 && (
            <div className="rounded-2xl bg-white p-8 text-center text-slate-500 shadow">
              No teams or games generated for this match.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function TeamPlayers({
  title,
  teamRating,
  ratingLabel,
  savedLineups,
  useSavedLineups,
  roster,
  line,
  player1Field,
  player2Field,
  updateLinePlayer,
  applySavedLineup,
  rosterOptionName,
  disabled = false,
}) {
  function selectedPlayerFor(field) {
    const playerKey = field.replace(/_id$/, "");
    const player = line[playerKey];
    const playerId = line[field];

    if (!playerId || !player) return null;

    const existsInRoster = roster.some(
      (row) => String(row.members?.id) === String(playerId)
    );

    if (existsInRoster) return null;

    return {
      id: playerId,
      label: `${player.last_name || ""}, ${player.first_name || ""}`.trim() ||
        `${player.first_name || ""} ${player.last_name || ""}`.trim() ||
        "Selected Player",
    };
  }

  const selectedPlayer1 = selectedPlayerFor(player1Field);
  const selectedPlayer2 = selectedPlayerFor(player2Field);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-2">
      <h3 className="flex flex-wrap items-center gap-2 text-sm font-bold text-slate-900">
        <span>{title}</span>
        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-800">
          Team {ratingLabel}: {teamRating}
        </span>
      </h3>

      {useSavedLineups && savedLineups.length > 0 && (
        <div className="mt-2">
          <div className="mb-1 text-xs font-bold uppercase tracking-wide text-blue-900">
            Saved Match Setup Team
          </div>
          <select
            value=""
            onChange={(e) => applySavedLineup(e.target.value)}
            disabled={disabled}
          className="w-full rounded-lg border border-blue-200 bg-blue-50 px-2 py-3 text-sm font-semibold text-blue-950 md:py-1.5"
          >
            <option value="">Use this saved team</option>
            {savedLineups.map((lineup) => (
              <option key={lineup.id} value={lineup.id}>
                Team {lineup.line_number}: {formatSavedLineupName(lineup)}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
        <select
          value={line[player1Field] || ""}
          onChange={(e) => updateLinePlayer(line.id, player1Field, e.target.value)}
          disabled={disabled}
          className="w-full rounded-lg border border-slate-300 px-2 py-3 text-sm md:py-1.5"
        >
          <option value="">Select Player 1</option>
          {selectedPlayer1 && (
            <option value={selectedPlayer1.id}>{selectedPlayer1.label}</option>
          )}

          {roster.map((player) => (
            <option key={player.members?.id} value={player.members?.id}>
              {rosterOptionName(player)}
            </option>
          ))}
        </select>

        <select
          value={line[player2Field] || ""}
          onChange={(e) => updateLinePlayer(line.id, player2Field, e.target.value)}
          disabled={disabled}
          className="w-full rounded-lg border border-slate-300 px-2 py-3 text-sm md:py-1.5"
        >
          <option value="">Select Player 2</option>
          {selectedPlayer2 && (
            <option value={selectedPlayer2.id}>{selectedPlayer2.label}</option>
          )}

          {roster.map((player) => (
            <option key={player.members?.id} value={player.members?.id}>
              {rosterOptionName(player)}
            </option>
          ))}
        </select>
      </div>

    </div>
  );
}

function formatSavedLineupName(lineup) {
  const first = formatSmallMemberName(lineup.player_1);
  const second = formatSmallMemberName(lineup.player_2);
  return [first, second].filter(Boolean).join(" / ") || "Incomplete";
}

function formatSmallMemberName(member) {
  if (!member) return "";
  return `${member.first_name || ""} ${member.last_name || ""}`.trim();
}

function capitalizeFirst(value) {
  if (!value) return "";
  const text = String(value).trim();
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1);
}






