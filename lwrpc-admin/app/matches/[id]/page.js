"use client";

import LoadingScreen from "../../components/LoadingScreen";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import AppHeader from "../../components/AppHeader";
import { requireRole, supabase } from "../../lib/auth";
import { formatDisplayDate, formatDisplayTime, formatDisplayTimestampShort } from "../../lib/dateTime";
import { splitNotificationRecipients } from "../../lib/notificationPreferences";
import { hasRole } from "../../lib/permissions";
import { rebuildDivisionStandingsForDivision } from "../../lib/standingsRebuild";
import { confirmUnsavedChanges, useUnsavedChangesWarning } from "../../lib/useUnsavedChangesWarning";
import {
  gameHasScoreEntry as sharedGameHasScoreEntry,
  getLineSummary as sharedGetLineSummary,
  isPicklebreakerLine as sharedIsPicklebreakerLine,
  lineRequiresValidation as sharedLineRequiresValidation,
  lineScoreRequired as sharedLineScoreRequired,
  matchPointSummary as sharedMatchPointSummary,
  picklebreakerValidationIssues,
  requiredLineGameIds as sharedRequiredLineGameIds,
} from "../../lib/matchScoring";
import {
  isSpecialMatchResult,
  specialMatchResultLabel,
  specialMatchWinnerName,
} from "../../lib/specialMatchResults";

function lmsLineScoreRequired(line) {
  return sharedLineScoreRequired(line);
}

function lmsGameHasScoreEntry(game) {
  return sharedGameHasScoreEntry(game);
}

function lmsLineRequiresValidation(line, lineGames) {
  return sharedLineRequiresValidation(line, lineGames);
}

function lmsRequiredLineGameIds(lineGames, line = null) {
  return sharedRequiredLineGameIds(lineGames, line);
}

export default function MatchDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
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
  const [scoreDirty, setScoreDirty] = useState(false);
  const [scoreValidationIssueList, setScoreValidationIssueList] = useState([]);
  const [scoreValidationSubmitting, setScoreValidationSubmitting] = useState(false);
  const [scoreEntryMode, setScoreEntryMode] = useState("normal");
  const [specialResult, setSpecialResult] = useState({
    resultType: "forfeit",
    homeScore: "",
    awayScore: "",
    notes: "",
  });
  const [showMatchNotes, setShowMatchNotes] = useState(false);
  const pendingGameUpdatesRef = useRef(new Map());
  const scoreValidationSubmittingRef = useRef(false);

  useUnsavedChangesWarning(scoreDirty, "match scores");

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
          co_captain_2_member_id,
          club_pro_member_id
        ),
        away_team:teams!matches_away_team_id_fkey(
          id,
          name,
          captain_member_id,
          co_captain_member_id,
          co_captain_2_member_id,
          club_pro_member_id
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
          win_by,
          team_win_points,
          picklebreaker_not_played_points,
          picklebreaker_not_played_award_rule,
          picklebreaker_play_rule,
          standings_points_mode,
          posted_to_dupr,
          uses_saved_match_lineups,
          score_required
        ),
        home_player_1:members!match_lines_home_player_1_id_fkey(id, first_name, last_name, self_rating),
        home_player_2:members!match_lines_home_player_2_id_fkey(id, first_name, last_name, self_rating),
        away_player_1:members!match_lines_away_player_1_id_fkey(id, first_name, last_name, self_rating),
        away_player_2:members!match_lines_away_player_2_id_fkey(id, first_name, last_name, self_rating)
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
        player_1:members!match_lineups_player_1_member_id_fkey(id, first_name, last_name, self_rating),
        player_2:members!match_lineups_player_2_member_id_fkey(id, first_name, last_name, self_rating)
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
    setScoreEntryMode(isSpecialMatchResult(matchData) ? "special" : "normal");
    setSpecialResult({
      resultType: isSpecialMatchResult(matchData) ? matchData.result_type : "forfeit",
      homeScore: matchData.home_score ?? "",
      awayScore: matchData.away_score ?? "",
      notes: matchData.result_notes || "",
    });
    setLines(lineData || []);
    setHomeRoster(homeRosterData || []);
    setAwayRoster(awayRosterData || []);
    setSeasonRatings(ratingData);
    setMatchLineups(lineupData || []);
    setGames(gameData);
    setScoreValidationIssueList([]);
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

  function memberHasValidRating(member) {
    const rating = memberRating(member);
    return rating !== null && rating !== undefined && rating !== "" && Number.isFinite(Number(rating));
  }

  function rosterRowHasValidRating(row) {
    return memberHasValidRating(row?.members);
  }

  function savedLineupHasValidRatings(lineup) {
    return memberHasValidRating(lineup?.player_1) && memberHasValidRating(lineup?.player_2);
  }

  function ratingNeededPlayerNames(players) {
    return players
      .filter((player) => player && !memberHasValidRating(player))
      .map((player) => `${player.first_name || ""} ${player.last_name || ""}`.trim())
      .filter(Boolean);
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

  function isPicklebreakerLine(line) {
    return sharedIsPicklebreakerLine(line);
  }

  function teamSlotLabel(line) {
    const slot = teamSlotNumber(line);
    return `Game ${slot || "-"}`;
  }

  function formatLineInfo(line, lineGames) {
    const divisionLine = line.division_lines;
    const pieces = [
      capitalizeFirst(divisionLine?.line_type),
      duprPostedLabel(line),
      lmsLineScoreRequired(line) ? "Required" : "Optional",
      capitalizeFirst(divisionLine?.game_format),
      `${lineGames.length || divisionLine?.games_per_line || 1} game(s)`,
    ].filter(Boolean);

    return pieces.join(" - ");
  }

  function duprPostedLabel(line) {
    const posted = line?.posted_to_dupr ?? line?.division_lines?.posted_to_dupr;
    return posted ? "Posted to DUPR" : "Not Posted to DUPR";
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
  const specialResultAllowed = hasRole(currentUserRole, "league_manager");
  const activeScoreEntryMode = specialResultAllowed ? scoreEntryMode : "normal";

  function canEditScoreEntry() {
    if (!canManageScores()) return false;
    if (isScoringOperationsOverride()) return true;
    if (match?.score_status === "verified") return false;
    if (match?.score_status === "pending_verification") {
      return currentUserSubmittedScores();
    }

    return true;
  }

  const getLineSummary = useCallback(function getLineSummary(line) {
    return sharedGetLineSummary(line, games.filter((game) => game.match_line_id === line.id), match);
  }, [games, match]);

  const matchPointTotals = useMemo(() =>
    sharedMatchPointSummary(displayedLines, games, match),
  [displayedLines, games, match]);

  const lineTeamWinPoints = useCallback(function lineTeamWinPoints(line, summary) {
    return matchPointTotals.pointsByLineId[String(line.id)] || { home: 0, away: 0, mode: "unawarded", pointAwardTeamId: summary?.winningTeamId || null };
  }, [matchPointTotals]);

  function formatLineTeamPoints(linePoints) {
    const homePoints = Number(linePoints.home || 0);
    const awayPoints = Number(linePoints.away || 0);
    const labels = [];

    if (homePoints > 0) {
      labels.push(`${homePoints} to ${match?.home_team?.name || "Home"}`);
    }

    if (awayPoints > 0) {
      labels.push(`${awayPoints} to ${match?.away_team?.name || "Away"}`);
    }

    const suffix = linePoints.mode === "not_played" ? " (not played)" : "";
    return labels.length > 0 ? `${labels.join(" / ")}${suffix}` : "-";
  }

  function lineIsNotPlayedPicklebreaker(line) {
    if (!isPicklebreakerLine(line)) return false;
    const summary = getLineSummary(line);
    const linePoints = lineTeamWinPoints(line, summary);
    return linePoints.mode === "not_played";
  }

  const playerAssignmentCounts = useMemo(() => {
    const counts = {};

    displayedLines.forEach((line) => {
      if (isPicklebreakerLine(line)) return;

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

    const ratingNeededNames = ratingNeededPlayerNames([
      line.home_player_1,
      line.home_player_2,
      line.away_player_1,
      line.away_player_2,
    ]);

    if (ratingNeededNames.length > 0) {
      warnings.push(`${[...new Set(ratingNeededNames)].join(", ")} need a valid ${ratingLabel()} rating before scores can be submitted.`);
    }

    const overLimitNames = isPicklebreakerLine(line)
      ? []
      : [
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

  function clearScoreValidationIssuesForLineIds(lineIds) {
    const lineIdSet = new Set(lineIds.map((lineId) => String(lineId)));

    setScoreValidationIssueList((current) =>
      current.filter((issue) => !lineIdSet.has(String(issue.lineId)))
    );
  }

  function clearScoreValidationIssuesForGame(gameId) {
    setScoreValidationIssueList((current) =>
      current.filter((issue) => String(issue.gameId || "") !== String(gameId))
    );
  }

  const matchSummary = useMemo(() => {
    return {
      homeWins: matchPointTotals.homeWins,
      awayWins: matchPointTotals.awayWins,
      winningTeamId: matchPointTotals.winningTeamId,
      winnerName: matchPointTotals.winnerName,
    };
  }, [matchPointTotals]);

  const specialResultPreview = useMemo(() => {
    const homeScore = specialScoreNumber(specialResult.homeScore);
    const awayScore = specialScoreNumber(specialResult.awayScore);
    const hasScore = homeScore !== null && awayScore !== null;
    const winningTeamId = hasScore
      ? homeScore > awayScore
        ? match?.home_team_id || null
        : awayScore > homeScore
          ? match?.away_team_id || null
          : null
      : null;
    const winnerName = !hasScore
      ? "-"
      : winningTeamId === match?.home_team_id
        ? match?.home_team?.name || "Home"
        : winningTeamId === match?.away_team_id
          ? match?.away_team?.name || "Away"
          : "Tie";

    return {
      homeScore,
      awayScore,
      hasScore,
      winningTeamId,
      winnerName,
      scoreText: hasScore ? `${homeScore} - ${awayScore}` : "-",
    };
  }, [match, specialResult]);

  const displayedMatchScore = activeScoreEntryMode === "special"
    ? {
        homeWins: specialResultPreview.hasScore ? specialResultPreview.homeScore : match?.home_score ?? 0,
        awayWins: specialResultPreview.hasScore ? specialResultPreview.awayScore : match?.away_score ?? 0,
        winningTeamId: specialResultPreview.hasScore ? specialResultPreview.winningTeamId : match?.winning_team_id || null,
        winnerName: specialResultPreview.hasScore ? specialResultPreview.winnerName : specialMatchWinnerName(match),
      }
    : matchSummary;

  function specialScoreNumber(value) {
    const text = String(value ?? "").trim();
    if (!text) return null;
    const number = Number(text);
    return Number.isFinite(number) ? number : null;
  }

  function updateSpecialResult(field, value) {
    if (!specialResultAllowed) {
      alert("Only League Managers and Commissioners can enter special match results.");
      return;
    }

    if (!canEditScoreEntry()) {
      alert("Only the captain or co-captain who submitted these pending scores can make corrections.");
      return;
    }

    const normalizedValue =
      field === "homeScore" || field === "awayScore"
        ? String(value).replace(/\D/g, "")
        : value;

    setScoreDirty(true);
    setScoreValidationIssueList([]);
    setSpecialResult((current) => ({
      ...current,
      [field]: normalizedValue,
    }));
  }

  function selectScoreEntryMode(mode) {
    if (mode === scoreEntryMode) return;
    if (mode === "special" && !specialResultAllowed) {
      alert("Only League Managers and Commissioners can enter special match results.");
      return;
    }
    if (!canEditScoreEntry() && mode !== scoreEntryMode) return;
    setScoreDirty(true);
    setScoreEntryMode(mode);
    setScoreValidationIssueList([]);
  }

  async function updateLinePlayer(lineId, field, value) {
    if (!canEditScoreEntry()) {
      alert("Only the captain or co-captain who submitted these pending scores can make corrections.");
      return;
    }

    const selectedLine = lines.find((line) => line.id === lineId);

    if (!selectedLine) return;

    if (lineIsNotPlayedPicklebreaker(selectedLine)) {
      alert("This Picklebreaker is not played because the regular game-line team points are not tied.");
      return;
    }

    setScoreDirty(true);
    clearScoreValidationIssuesForLineIds([lineId]);

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

    clearScoreValidationIssuesForLineIds(lineIdsToUpdate);

    const roster = field.startsWith("home_") ? homeRoster : awayRoster;
    const selectedRosterRow = roster.find((row) => String(row.members?.id) === String(value));

    if (value && selectedRosterRow && !rosterRowHasValidRating(selectedRosterRow)) {
      alert(`${rosterOptionName(selectedRosterRow)} needs a valid ${ratingLabel()} rating before they can be entered as an actual player.`);
      return;
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
    if (!canEditScoreEntry()) {
      alert("Only the captain or co-captain who submitted these pending scores can make corrections.");
      return;
    }

    if (!lineupId) return;

    const lineup = matchLineups.find((item) => item.id === lineupId);
    if (!lineup) return;

    if (!savedLineupHasValidRatings(lineup)) {
      const names = ratingNeededPlayerNames([lineup.player_1, lineup.player_2]);
      alert(`${names.join(" and ") || "This saved match setup team"} need a valid ${ratingLabel()} rating before they can be entered as actual players.`);
      return;
    }

    if (lineIsNotPlayedPicklebreaker(line)) {
      alert("This Picklebreaker is not played because the regular game-line team points are not tied.");
      return;
    }

    setScoreDirty(true);
    clearScoreValidationIssuesForLineIds([line.id]);

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

  function queueGameUpdate(gameId, field, normalizedValue) {
    const key = `${gameId}:${field}`;
    const previousUpdate = pendingGameUpdatesRef.current.get(key) || Promise.resolve();

    const updatePromise = previousUpdate
      .catch(() => {})
      .then(async () => {
        const { error } = await supabase
          .from("line_games")
          .update({
            [field]: normalizedValue,
            updated_at: new Date().toISOString(),
          })
          .eq("id", gameId);

        if (error) throw error;
      })
      .catch((error) => {
        alert(error.message);
        loadData();
      });

    const trackedPromise = updatePromise.finally(() => {
      if (pendingGameUpdatesRef.current.get(key) === trackedPromise) {
        pendingGameUpdatesRef.current.delete(key);
      }
    });

    pendingGameUpdatesRef.current.set(key, trackedPromise);
    return trackedPromise;
  }

  async function flushPendingGameUpdates() {
    const pendingUpdates = Array.from(pendingGameUpdatesRef.current.values());
    if (pendingUpdates.length === 0) return;
    await Promise.all(pendingUpdates);
  }

  async function updateGame(gameId, field, value) {
    if (!canEditScoreEntry()) {
      alert("Only the captain or co-captain who submitted these pending scores can make corrections.");
      return;
    }

    const game = games.find((item) => item.id === gameId);
    const line = lines.find((item) => item.id === game?.match_line_id);

    if (line && lineIsNotPlayedPicklebreaker(line)) {
      alert("This Picklebreaker is not played because the regular game-line team points are not tied.");
      return;
    }

    if ((field === "home_score" || field === "away_score") && line && lineHasBlockingRatingWarning(line)) {
      alert("This game line has a team over the division rating maximum. Fix the players before entering scores for this line.");
      return;
    }

    const numericValue = String(value).replace(/\D/g, "");
    const normalizedValue =
      field === "game_status" ? value || "completed" : numericValue === "" ? null : Number(numericValue);
    const forfeitedGame = field === "game_status" && isForfeitStatus(normalizedValue);

    setScoreDirty(true);
    clearScoreValidationIssuesForGame(gameId);

    setGames((currentGames) =>
      currentGames.map((game) =>
        game.id === gameId
          ? {
              ...game,
              [field]: normalizedValue,
              ...(forfeitedGame ? { home_score: 0, away_score: 0 } : {}),
            }
          : game
      )
    );

    await queueGameUpdate(gameId, field, normalizedValue);
    if (forfeitedGame) {
      await Promise.all([
        queueGameUpdate(gameId, "home_score", 0),
        queueGameUpdate(gameId, "away_score", 0),
      ]);
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
    if (game?.notNeeded) return "Not needed";

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

    return Boolean(memberCaptainSide(memberId));
  }

  function memberCaptainSide(memberId) {
    if (!memberId || !match) return "";

    const id = String(memberId);
    const homeCaptainIds = [
      match.home_team?.captain_member_id,
      match.home_team?.co_captain_member_id,
      match.home_team?.co_captain_2_member_id,
      match.home_team?.club_pro_member_id,
    ].map((captainId) => String(captainId || ""));
    const awayCaptainIds = [
      match.away_team?.captain_member_id,
      match.away_team?.co_captain_member_id,
      match.away_team?.co_captain_2_member_id,
      match.away_team?.club_pro_member_id,
    ].map((captainId) => String(captainId || ""));

    if (homeCaptainIds.includes(id)) return "home";
    if (awayCaptainIds.includes(id)) return "away";

    return "";
  }

  function isOpposingCaptainForSubmittedScores() {
    const currentSide = memberCaptainSide(currentUserMember?.id);
    const submitterSide = memberCaptainSide(match?.score_entered_by_member_id);

    return Boolean(currentSide && submitterSide && currentSide !== submitterSide);
  }

  function isMatchCaptainMember(memberId) {
    if (!memberId || !match) return false;

    return [
      match.home_team?.captain_member_id,
      match.home_team?.co_captain_member_id,
      match.home_team?.co_captain_2_member_id,
      match.home_team?.club_pro_member_id,
      match.away_team?.captain_member_id,
      match.away_team?.co_captain_member_id,
      match.away_team?.co_captain_2_member_id,
      match.away_team?.club_pro_member_id,
    ].some((captainId) => String(captainId) === String(memberId));
  }

  function canManageScores() {
    return isCaptainView() || hasRole(currentUserRole, "league_manager");
  }

  function isManagerOverride() {
    return hasRole(currentUserRole, "league_manager");
  }

  function isScoringOperationsOverride() {
    return isManagerOverride() && searchParams.get("from") === "scoring";
  }

  function shouldReturnToScheduleEditor() {
    return isScoringOperationsOverride() && searchParams.get("returnTo") === "schedule-editor";
  }

  function matchReturnPath() {
    if (shouldReturnToScheduleEditor()) return "/schedule-editor";
    if (isScoringOperationsOverride()) return "/scoring";
    return isCaptainView() ? "/captain-dashboard" : "/schedule-editor";
  }

  function matchReturnLabel() {
    if (shouldReturnToScheduleEditor()) return "Schedule Editor";
    if (isScoringOperationsOverride()) return "Scoring Operations";
    return isCaptainView() ? "Captain Dashboard" : "Schedule Editor";
  }

  function currentUserSubmittedScores() {
    return (
      currentUserMember?.id &&
      match?.score_entered_by_member_id &&
      String(match.score_entered_by_member_id) === String(currentUserMember.id)
    );
  }

  function canReviewSubmittedScores() {
    return (
      canManageScores() &&
      match?.score_status === "pending_verification" &&
      !currentUserSubmittedScores() &&
      (isManagerOverride() ||
        !isMatchCaptainMember(match?.score_entered_by_member_id) ||
        isOpposingCaptainForSubmittedScores())
    );
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
    const winBy = Number(line.division_lines?.win_by || 0);
    const requiredGameIds = lmsRequiredLineGameIds(lineGames, line);
    const picklebreakerIssues = isPicklebreakerLine(line)
      ? picklebreakerValidationIssues(displayedLines, games, match, teamSlotLabel)
          .filter((issue) => String(issue.lineId || "") === String(line.id))
      : [];

    if (picklebreakerIssues.length > 0) return picklebreakerIssues;

    if (isPicklebreakerLine(line) && !lineGames.some(lmsGameHasScoreEntry)) {
      return issues;
    }

    const lineRequiresValidation = lmsLineRequiresValidation(line, lineGames);

    if (lineRequiresValidation && lineWarnings(line).length > 0) {
      issues.push(
        ...lineWarnings(line).map((message) => ({
          lineId: line.id,
          gameId: null,
          message,
        }))
      );
    }

    lineGames.forEach((game) => {
      if (!requiredGameIds.has(String(game.id))) return;
      if (!lineRequiresValidation) return;

      const status = game.game_status && game.game_status !== "scheduled" ? game.game_status : "completed";
      const gameLabel = `${teamSlotLabel(line)} Game ${game.game_number || ""}`.trim();
      const gameIssue = (message) => ({
        lineId: line.id,
        gameId: game.id,
        message: `${gameLabel}: ${message}`,
      });

      if (isForfeitStatus(status)) return;

      const hasAllPlayers = linePlayerIds(line).every(Boolean);

      if (!hasAllPlayers) {
        issues.push(gameIssue("all players are required unless the result is a forfeit."));
      }

      if (game.home_score === null || game.home_score === undefined || game.away_score === null || game.away_score === undefined) {
        issues.push(gameIssue("both scores are required unless the result is a forfeit."));
        return;
      }

      if (!isRetiredStatus(status) && pointsToWin > 0) {
        const homeScore = Number(game.home_score || 0);
        const awayScore = Number(game.away_score || 0);
        const highScore = Math.max(homeScore, awayScore);
        const lowScore = Math.min(homeScore, awayScore);

        if (winBy === 1) {
          if (highScore > pointsToWin) {
            issues.push(gameIssue(`Win By 1 games cannot have a score higher than ${pointsToWin}.`));
          }

          if (homeScore !== pointsToWin && awayScore !== pointsToWin) {
            issues.push(gameIssue(`Win By 1 games must have one team score exactly ${pointsToWin}.`));
          }

          return;
        }

        if (highScore < pointsToWin) {
          issues.push(gameIssue(`at least one score must be ${pointsToWin} or higher for a completed game.`));
        }

        if (winBy > 0 && highScore - lowScore < winBy) {
          issues.push(gameIssue(`winning margin must be at least ${winBy}.`));
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

    await flushPendingGameUpdates();

    const issues = scoreValidationIssues();

    if (issues.length > 0) {
      setScoreValidationIssueList(issues);
      alert(["Scores cannot be saved yet.", "", ...issues.map((issue) => `- ${issue.message}`)].join("\n"));
      return false;
    }

    setScoreValidationIssueList([]);

    for (const line of displayedLines) {
      const summary = getLineSummary(line);
      const linePoints = lineTeamWinPoints(line, summary);
      const winningTeamId = isPicklebreakerLine(line) && linePoints.mode === "not_played"
        ? linePoints.pointAwardTeamId
        : summary.winningTeamId;
      const lineStatus = winningTeamId ? "completed" : "scheduled";

      const { error } = await supabase
        .from("match_lines")
        .update({
          winning_team_id: winningTeamId,
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
    if (!canEditScoreEntry()) {
      alert("Only the captain or co-captain who submitted these pending scores, or Scoring Operations managers, can make corrections and resubmit.");
      return;
    }

    const scoringOperationsOverride = isScoringOperationsOverride();

    if (activeScoreEntryMode === "special") {
      await completeSpecialMatch(scoringOperationsOverride);
      return;
    }

    if (match.score_status === "pending_verification" && !scoringOperationsOverride) {
      if (!confirm("Scores have already been submitted for verification. Save changes and resubmit?")) return;
    }

    await flushPendingGameUpdates();

    const issues = scoreValidationIssues();
    if (issues.length > 0) {
      setScoreValidationIssueList(issues);
      alert(["Scores cannot be submitted yet.", "", ...issues.map((issue) => `- ${issue.message}`)].join("\n"));
      return;
    }

    setScoreValidationIssueList([]);

    const saved = await saveCalculatedWinners(false);

    if (!saved) return;

    const currentMemberId = currentUserMember?.id || null;
    const now = new Date().toISOString();
    const matchUpdate = scoringOperationsOverride
      ? {
          status: "completed",
          score_status: "verified",
          score_entered_by_member_id: currentMemberId,
          score_entered_at: now,
          score_verified_by_member_id: currentMemberId,
          score_verified_at: now,
          score_disputed: false,
          score_dispute_notes: null,
          finalized_at: now,
          home_score: matchSummary.homeWins,
          away_score: matchSummary.awayWins,
          winning_team_id: matchSummary.winningTeamId,
          result_type: "played",
          result_notes: null,
          updated_at: now,
        }
      : {
          status: "completed",
          score_status: "pending_verification",
          score_entered_by_member_id: currentMemberId,
          score_entered_at: now,
          score_verified_by_member_id: null,
          score_verified_at: null,
          finalized_at: null,
          home_score: matchSummary.homeWins,
          away_score: matchSummary.awayWins,
          winning_team_id: matchSummary.winningTeamId,
          result_type: "played",
          result_notes: null,
          updated_at: now,
        };

    const { error } = await supabase
      .from("matches")
      .update(matchUpdate)
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    if (scoringOperationsOverride) {
      const standingsResult = await rebuildDivisionStandings();
      await sendScoreNotification("changed");

      alert(
        standingsResult?.byeAdjustmentApplied
          ? "Scores submitted, verified, final bye adjustments applied, standings updated, and match captains notified."
          : "Scores submitted, verified, standings updated, and match captains notified."
      );
    } else {
      await sendScoreNotification("submitted");

      alert("Scores submitted for verification and opposing captains notified.");
    }

    setScoreDirty(false);
    router.push(matchReturnPath());
  }

  async function completeSpecialMatch(scoringOperationsOverride) {
    if (!specialResultAllowed) {
      alert("Only League Managers and Commissioners can enter special match results.");
      return;
    }

    if (match.score_status === "pending_verification" && !scoringOperationsOverride) {
      if (!confirm("Scores have already been submitted for verification. Save changes and resubmit?")) return;
    }

    await flushPendingGameUpdates();

    const homeScore = specialScoreNumber(specialResult.homeScore);
    const awayScore = specialScoreNumber(specialResult.awayScore);
    const resultType = specialResult.resultType === "weather" ? "weather" : "forfeit";
    const issues = [];

    if (homeScore === null || awayScore === null) {
      issues.push({
        lineId: null,
        gameId: null,
        message: "Special Match Result: both match scores are required.",
      });
    }

    if (resultType === "forfeit" && homeScore !== null && awayScore !== null && homeScore === awayScore) {
      issues.push({
        lineId: null,
        gameId: null,
        message: "Special Match Result: a forfeit result must have a winning team.",
      });
    }

    if (issues.length > 0) {
      setScoreValidationIssueList(issues);
      alert(["Scores cannot be submitted yet.", "", ...issues.map((issue) => `- ${issue.message}`)].join("\n"));
      return;
    }

    setScoreValidationIssueList([]);

    const currentMemberId = currentUserMember?.id || null;
    const now = new Date().toISOString();
    const winningTeamId =
      homeScore > awayScore
        ? match.home_team_id
        : awayScore > homeScore
          ? match.away_team_id
          : null;
    const trimmedNotes = String(specialResult.notes || "").trim();
    const matchUpdate = scoringOperationsOverride
      ? {
          status: "completed",
          score_status: "verified",
          score_entered_by_member_id: currentMemberId,
          score_entered_at: now,
          score_verified_by_member_id: currentMemberId,
          score_verified_at: now,
          score_disputed: false,
          score_dispute_notes: null,
          finalized_at: now,
          home_score: homeScore,
          away_score: awayScore,
          winning_team_id: winningTeamId,
          result_type: resultType,
          result_notes: trimmedNotes || null,
          updated_at: now,
        }
      : {
          status: "completed",
          score_status: "pending_verification",
          score_entered_by_member_id: currentMemberId,
          score_entered_at: now,
          score_verified_by_member_id: null,
          score_verified_at: null,
          finalized_at: null,
          home_score: homeScore,
          away_score: awayScore,
          winning_team_id: winningTeamId,
          result_type: resultType,
          result_notes: trimmedNotes || null,
          updated_at: now,
        };

    const { error } = await supabase
      .from("matches")
      .update(matchUpdate)
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    const scoreText = `${homeScore}-${awayScore}`;

    if (scoringOperationsOverride) {
      const standingsResult = await rebuildDivisionStandings();
      await sendScoreNotification("changed", scoreText);

      alert(
        standingsResult?.byeAdjustmentApplied
          ? "Special result submitted, verified, final bye adjustments applied, standings updated, and match captains notified."
          : "Special result submitted, verified, standings updated, and match captains notified."
      );
    } else {
      await sendScoreNotification("submitted", scoreText);

      alert("Special result submitted for verification and opposing captains notified.");
    }

    setScoreDirty(false);
    router.push(matchReturnPath());
  }

  async function verifyScores() {
    if (scoreValidationSubmittingRef.current) return;

    if (!canManageScores()) {
      alert("Only captains for this match can verify scores.");
      return;
    }

    if (!canReviewSubmittedScores()) {
      alert("Only the opposing captain or co-captain can validate these scores.");
      return;
    }

    if (!currentUserMember?.id) {
      alert("Unable to identify current member.");
      return;
    }

    scoreValidationSubmittingRef.current = true;
    setScoreValidationSubmitting(true);

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
      scoreValidationSubmittingRef.current = false;
      setScoreValidationSubmitting(false);
      alert(error.message);
      return;
    }

    const standingsResult = await rebuildDivisionStandings();
    await sendScoreNotification("verified");

    alert(
      standingsResult?.byeAdjustmentApplied
        ? "Scores verified, final bye adjustments applied, and standings updated."
        : "Scores verified and standings updated."
    );

    setScoreDirty(false);
    router.push(matchReturnPath());
  }

  async function disputeScores() {
    if (!canManageScores()) {
      alert("Only captains for this match can dispute scores.");
      return;
    }

    if (!canReviewSubmittedScores()) {
      alert("Only the opposing captain or co-captain can dispute these scores.");
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
        score_verified_by_member_id: null,
        score_verified_at: null,
        finalized_at: null,
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

  async function sendScoreNotification(notificationType, scoreText = null) {
    try {
      const teamIds = notificationTeamIdsForCurrentUser(notificationType === "changed");

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
          ),
          club_pro:members!teams_club_pro_member_id_fkey (
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
          team?.club_pro,
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
          score: scoreText || `${matchSummary.homeWins}-${matchSummary.awayWins}`,
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

  function notificationTeamIdsForCurrentUser(includeAllMatchCaptains = false) {
    const memberId = currentUserMember?.id;
    const homeCaptainIds = [
      match.home_team?.captain_member_id,
      match.home_team?.co_captain_member_id,
      match.home_team?.co_captain_2_member_id,
      match.home_team?.club_pro_member_id,
    ].filter(Boolean);
    const awayCaptainIds = [
      match.away_team?.captain_member_id,
      match.away_team?.co_captain_member_id,
      match.away_team?.co_captain_2_member_id,
      match.away_team?.club_pro_member_id,
    ].filter(Boolean);

    if (includeAllMatchCaptains) {
      return [match.home_team_id, match.away_team_id].filter(Boolean);
    }

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
    if (!match?.division_id) return null;

    const result = await rebuildDivisionStandingsForDivision(supabase, match.division_id);

    if (!result.success) alert(result.error || "Unable to rebuild standings.");

    return result;
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

  const scoreReviewAllowed = canReviewSubmittedScores();
  const scoreEntryEditable = canEditScoreEntry();
  const submitScoreLabel = activeScoreEntryMode === "special"
    ? isScoringOperationsOverride()
      ? "Submit/Verify Special Result"
      : "Submit Special Result"
    : isScoringOperationsOverride()
      ? "Submit/Verify Scores"
      : "Submit Scores";
  const scoreReviewActionsVisible =
    !isScoringOperationsOverride() && match.score_status === "pending_verification" && scoreReviewAllowed;
  const scoreValidationIssuesByGameId = scoreValidationIssueList.reduce((grouped, issue) => {
    if (!issue.gameId) return grouped;

    const key = String(issue.gameId);
    return {
      ...grouped,
      [key]: [...(grouped[key] || []), issue.message],
    };
  }, {});
  const specialResultIssues = scoreValidationIssueList.filter((issue) => !issue.lineId && !issue.gameId);

  return (
    <main className="min-h-screen bg-slate-100 p-4 pb-28 md:p-6">
      <div className="mx-auto max-w-7xl">
        <AppHeader
          title="Enter Match Scores"
          subtitle="Assign players by team, enter game scores, and submit final results."
        />

        <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:flex lg:flex-wrap lg:gap-3">
          <button
            type="button"
            onClick={() => {
              if (confirmUnsavedChanges()) {
                router.push(matchReturnPath());
              }
            }}
            className="rounded-xl bg-slate-200 px-4 py-3 font-semibold hover:bg-slate-300 lg:py-2"
          >
            Back to {matchReturnLabel()}
          </button>

          {scoreEntryEditable && (
            <button
              type="button"
              onClick={completeMatch}
              className="rounded-xl bg-green-700 px-4 py-3 font-semibold text-white hover:bg-green-800 lg:py-2"
            >
              {submitScoreLabel}
            </button>
          )}

          {scoreReviewActionsVisible && (
            <>
              <button
                type="button"
                onClick={verifyScores}
                disabled={scoreValidationSubmitting}
                className="rounded-xl bg-emerald-700 px-4 py-3 font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300 lg:py-2"
              >
                {scoreValidationSubmitting ? "Validating..." : "Validate Scores"}
              </button>

              <button
                type="button"
                onClick={disputeScores}
                className="rounded-xl bg-red-700 px-4 py-3 font-semibold text-white hover:bg-red-800 lg:py-2"
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
              {currentUserSubmittedScores() && !isManagerOverride()
                ? "You submitted these scores, so you may still correct and resubmit them here until the opposing captain validates or disputes them."
                : currentUserSubmittedScores()
                  ? "You submitted these scores, so you may still correct and resubmit them here until they are validated or disputed."
                  : "Review these submitted scores without making changes. Use Validate Scores when they are correct, or Dispute Scores if they need correction."}
            </div>
          </div>
        )}

        {activeScoreEntryMode === "normal" && (sameGameDuplicateLineIds.length > 0 || overLineLimitPlayerIds.length > 0) && (
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
                  Score: {formatMatchScoreStatus(match)}
                </span>
                <span className="rounded-full bg-green-100 px-3 py-1 text-green-900">
                  Winner: {displayedMatchScore.winnerName}
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
                {displayedMatchScore.homeWins} - {displayedMatchScore.awayWins}
              </div>
              <div className="mt-2 text-sm text-slate-300">Winner: {displayedMatchScore.winnerName}</div>
            </div>
          </div>

          {match.notes && (
            <div className="mt-4">
              <button
                type="button"
                onClick={() => setShowMatchNotes((value) => !value)}
                className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-black uppercase tracking-wide text-amber-900 hover:bg-amber-100"
              >
                {showMatchNotes ? "Hide Match Notes" : "Show Match Notes"}
              </button>
            </div>
          )}

          {match.notes && showMatchNotes && (
            <div className="mt-4 rounded-xl bg-amber-50 p-3 text-amber-900">
              <div className="font-semibold">Match Notes</div>
              <div className="mt-1 text-sm">{match.notes}</div>
            </div>
          )}
        </div>

        <div className="mt-4 space-y-4">
          {specialResultAllowed && (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow md:p-5">
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
              <div>
                <div className="text-xs font-black uppercase tracking-wide text-slate-500">
                  Score Entry Mode
                </div>
                <div className="mt-1 text-lg font-black text-slate-950">
                  {scoreEntryMode === "special" ? "Special Match Result" : "Normal Game Scores"}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1">
                {[
                  { value: "normal", label: "Normal Scores" },
                  { value: "special", label: "Special Result" },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => selectScoreEntryMode(option.value)}
                    disabled={!scoreEntryEditable && option.value !== scoreEntryMode}
                    className={`rounded-xl px-3 py-2 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-60 ${
                      scoreEntryMode === option.value
                        ? "bg-slate-950 text-white shadow"
                        : "bg-transparent text-slate-700 hover:bg-white"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {scoreEntryMode === "special" && (
              <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
                <div className="grid gap-3 md:grid-cols-3">
                  <label className="text-xs font-bold uppercase tracking-wide text-slate-600">
                    Result Type
                    <select
                      value={specialResult.resultType}
                      onChange={(event) => updateSpecialResult("resultType", event.target.value)}
                      disabled={!scoreEntryEditable}
                      className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-bold normal-case tracking-normal text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="forfeit">Forfeit</option>
                      <option value="weather">Weather</option>
                    </select>
                  </label>

                  <label className="text-xs font-bold uppercase tracking-wide text-slate-600">
                    {match.home_team?.name || "Home"} Score
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={specialResult.homeScore}
                      onChange={(event) => updateSpecialResult("homeScore", event.target.value)}
                      disabled={!scoreEntryEditable}
                      className="mt-1 w-full rounded-xl border-2 border-slate-300 bg-white px-3 py-3 text-center text-2xl font-black text-slate-950 shadow-inner outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </label>

                  <label className="text-xs font-bold uppercase tracking-wide text-slate-600">
                    {match.away_team?.name || "Away"} Score
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={specialResult.awayScore}
                      onChange={(event) => updateSpecialResult("awayScore", event.target.value)}
                      disabled={!scoreEntryEditable}
                      className="mt-1 w-full rounded-xl border-2 border-slate-300 bg-white px-3 py-3 text-center text-2xl font-black text-slate-950 shadow-inner outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </label>

                  <label className="text-xs font-bold uppercase tracking-wide text-slate-600 md:col-span-3">
                    Result Notes
                    <textarea
                      value={specialResult.notes}
                      onChange={(event) => updateSpecialResult("notes", event.target.value)}
                      disabled={!scoreEntryEditable}
                      rows={3}
                      className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-semibold normal-case tracking-normal text-slate-950 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </label>
                </div>

                <div className="rounded-2xl bg-slate-950 p-4 text-white">
                  <div className="text-xs font-black uppercase tracking-wide text-slate-300">
                    {specialMatchResultLabel(specialResult.resultType)} Result
                  </div>
                  <div className="mt-2 text-4xl font-black">
                    {specialResultPreview.scoreText}
                  </div>
                  <div className="mt-2 text-sm font-semibold text-slate-300">
                    Winner: {specialResultPreview.winnerName}
                  </div>
                </div>

                {specialResultIssues.length > 0 && (
                  <div className="lg:col-span-2 rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm font-bold text-red-800">
                    {specialResultIssues.map((issue) => (
                      <div key={issue.message}>{issue.message}</div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          )}

          {activeScoreEntryMode === "normal" && displayedLines.map((line) => {
            const divisionLine = line.division_lines;
            const lineGames = games.filter((game) => game.match_line_id === line.id);
            const requiredGameIdsForLine = lmsRequiredLineGameIds(lineGames, line);
            const lineSummary = getLineSummary(line);
            const linePoints = lineTeamWinPoints(line, lineSummary);
            const warnings = lineWarnings(line);
            const isPicklebreaker = isPicklebreakerLine(line);
            const picklebreakerNotPlayed = linePoints.mode === "not_played";
            const lineEntryDisabled = !scoreEntryEditable || picklebreakerNotPlayed;
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
                className={`overflow-hidden rounded-2xl border-2 shadow-lg transition-all ${
                  hasDuplicate ? "border-red-300 bg-red-50" : "border-blue-200 bg-blue-50/70"
                }`}
              >
                <div className="border-b border-blue-200 bg-white/85 p-4">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">
                      {teamSlotLabel(line)}
                      {divisionLine?.line_name ? ` - ${divisionLine.line_name}` : ""}
                    </h2>

                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-slate-600">
                        <span>{formatLineInfo(line, lineGames)}</span>
                        <span className="font-semibold text-slate-800">
                          Team Points: {formatLineTeamPoints(linePoints)}
                          {isPicklebreaker && (
                            <span className="ml-2 font-black text-red-700">
                              Enter starting team players only
                            </span>
                          )}
                        </span>
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

                <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-2">
                  <TeamPlayers
                    title={match.home_team?.name || "Home Team"}
                    teamRating={teamDuprRating(line.home_player_1, line.home_player_2)}
                    savedLineups={matchLineups.filter((lineup) => String(lineup.team_id) === String(match.home_team_id) && savedLineupHasValidRatings(lineup))}
                    useSavedLineups={line.division_lines?.uses_saved_match_lineups !== false}
                    roster={homeRoster}
                    line={line}
                    player1Field="home_player_1_id"
                    player2Field="home_player_2_id"
                    updateLinePlayer={updateLinePlayer}
                    applySavedLineup={(lineupId) => applySavedLineup(line, "home", lineupId)}
                    rosterOptionName={rosterOptionLabel}
                    rosterOptionDisabled={(player) => !rosterRowHasValidRating(player)}
                    disabled={lineEntryDisabled}
                  />

                  <TeamPlayers
                    title={match.away_team?.name || "Away Team"}
                    teamRating={teamDuprRating(line.away_player_1, line.away_player_2)}
                    savedLineups={matchLineups.filter((lineup) => String(lineup.team_id) === String(match.away_team_id) && savedLineupHasValidRatings(lineup))}
                    useSavedLineups={line.division_lines?.uses_saved_match_lineups !== false}
                    roster={awayRoster}
                    line={line}
                    player1Field="away_player_1_id"
                    player2Field="away_player_2_id"
                    updateLinePlayer={updateLinePlayer}
                    applySavedLineup={(lineupId) => applySavedLineup(line, "away", lineupId)}
                    rosterOptionName={rosterOptionLabel}
                    rosterOptionDisabled={(player) => !rosterRowHasValidRating(player)}
                    disabled={lineEntryDisabled}
                  />
                </div>

                <div className="space-y-3 p-4 pt-0 md:hidden">
                  {lineGames.map((game) => {
                    const gameNeeded = requiredGameIdsForLine.has(String(game.id));
                    const gameWinner = gameNeeded ? gameWinnerName(game) : "Not needed";
                    const gameIssues = scoreValidationIssuesByGameId[String(game.id)] || [];
                    const hasGameIssues = gameIssues.length > 0;

                    return (
                      <div
                        key={game.id}
                        className={`overflow-hidden rounded-2xl border-2 shadow-md ${
                          hasGameIssues
                            ? "border-red-500 bg-red-50 ring-4 ring-red-100"
                            : gameNeeded
                              ? "border-blue-300 bg-white"
                              : "border-slate-300 bg-slate-100"
                        }`}
                      >
                        <div className={`flex items-center justify-between gap-2 border-b px-4 py-3 ${
                          hasGameIssues ? "border-red-300 bg-red-100" : gameNeeded ? "border-blue-200 bg-blue-100" : "border-slate-300 bg-slate-200"
                        }`}>
                          <div className={`font-black uppercase tracking-wide ${
                            hasGameIssues ? "text-red-950" : "text-blue-950"
                          }`}>Game {game.game_number}</div>
                          <div className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-700">
                            Winner: {gameWinner}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2">
                          <label className="text-xs font-bold uppercase tracking-wide text-slate-600">
                            {match.home_team?.name || "Home"}
                            <input
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              value={game.home_score ?? ""}
                              onChange={(e) => updateGame(game.id, "home_score", e.target.value)}
                              disabled={lineEntryDisabled || scoresBlockedForLine || !gameNeeded}
                              className="mt-1 w-full rounded-2xl border-2 border-slate-300 bg-white px-3 py-3 text-center text-2xl font-black text-slate-950 shadow-inner outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
                            />
                          </label>

                          <label className="text-xs font-bold uppercase tracking-wide text-slate-600">
                            {match.away_team?.name || "Away"}
                            <input
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              value={game.away_score ?? ""}
                              onChange={(e) => updateGame(game.id, "away_score", e.target.value)}
                              disabled={lineEntryDisabled || scoresBlockedForLine || !gameNeeded}
                              className="mt-1 w-full rounded-2xl border-2 border-slate-300 bg-white px-3 py-3 text-center text-2xl font-black text-slate-950 shadow-inner outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
                            />
                          </label>
                        </div>

                        <select
                          value={game.game_status && game.game_status !== "scheduled" ? game.game_status : "completed"}
                          onChange={(e) => updateGame(game.id, "game_status", e.target.value)}
                          disabled={lineEntryDisabled || !gameNeeded}
                          className="mx-4 mb-4 w-[calc(100%-2rem)] rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {gameStatusOptions().map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>

                        {hasGameIssues && (
                          <div className="mx-4 mb-4 rounded-xl border border-red-300 bg-white px-3 py-2 text-sm font-bold text-red-800">
                            {gameIssues.map((issue) => (
                              <div key={issue}>{issue}</div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {lineGames.length === 0 && (
                    <div className="rounded-xl bg-slate-50 p-4 text-center text-slate-500">
                      No score rows found for this team.
                    </div>
                  )}
                </div>

                <div className="hidden overflow-x-auto border-t border-blue-200 bg-white/60 p-4 md:block">
                  <table className="w-full border-separate border-spacing-y-2 text-xs md:text-sm">
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
                        const gameNeeded = requiredGameIdsForLine.has(String(game.id));
                        const gameWinner = gameNeeded ? gameWinnerName(game) : "Not needed";
                        const gameIssues = scoreValidationIssuesByGameId[String(game.id)] || [];
                        const hasGameIssues = gameIssues.length > 0;

                        return [
                          <tr
                            key={game.id}
                            className={`rounded-xl shadow-sm ring-2 ${
                              hasGameIssues ? "bg-red-50 ring-red-300" : gameNeeded ? "bg-white ring-blue-100" : "bg-slate-100 ring-slate-300"
                            }`}
                          >
                            <td className={`rounded-l-xl border-y-2 border-l-2 p-3 font-black ${
                              hasGameIssues ? "border-red-300 text-red-950" : "border-blue-100 text-slate-900"
                            }`}>
                              {game.game_number}
                            </td>

                            <td className={`border-y-2 p-3 ${hasGameIssues ? "border-red-300" : "border-blue-100"}`}>
                              <input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                value={game.home_score ?? ""}
                                onChange={(e) => updateGame(game.id, "home_score", e.target.value)}
                                disabled={lineEntryDisabled || scoresBlockedForLine || !gameNeeded}
                                className={`w-20 rounded-xl border-2 bg-white px-2 py-2 text-center text-lg font-black shadow-inner outline-none transition focus:ring-4 ${
                                  hasGameIssues ? "border-red-400 focus:border-red-600 focus:ring-red-100" : "border-slate-300 focus:border-blue-600 focus:ring-blue-100"
                                } disabled:cursor-not-allowed disabled:opacity-50`}
                              />
                            </td>

                            <td className={`border-y-2 p-3 ${hasGameIssues ? "border-red-300" : "border-blue-100"}`}>
                              <input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                value={game.away_score ?? ""}
                                onChange={(e) => updateGame(game.id, "away_score", e.target.value)}
                                disabled={lineEntryDisabled || scoresBlockedForLine || !gameNeeded}
                                className={`w-20 rounded-xl border-2 bg-white px-2 py-2 text-center text-lg font-black shadow-inner outline-none transition focus:ring-4 ${
                                  hasGameIssues ? "border-red-400 focus:border-red-600 focus:ring-red-100" : "border-slate-300 focus:border-blue-600 focus:ring-blue-100"
                                } disabled:cursor-not-allowed disabled:opacity-50`}
                              />
                            </td>

                            <td className={`border-y-2 p-3 ${hasGameIssues ? "border-red-300" : "border-blue-100"}`}>
                              <select
                                value={game.game_status && game.game_status !== "scheduled" ? game.game_status : "completed"}
                                onChange={(e) => updateGame(game.id, "game_status", e.target.value)}
                                disabled={lineEntryDisabled || !gameNeeded}
                                className={`w-full min-w-40 rounded-xl border bg-white px-3 py-2 text-xs font-semibold ${
                                  hasGameIssues ? "border-red-400" : "border-slate-300"
                                } disabled:cursor-not-allowed disabled:opacity-50`}
                              >
                                {gameStatusOptions().map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            </td>

                            <td className={`rounded-r-xl border-y-2 border-r-2 p-3 font-semibold ${
                              hasGameIssues ? "border-red-300 text-red-950" : "border-blue-100 text-slate-700"
                            }`}>{gameWinner}</td>
                          </tr>,
                          hasGameIssues ? (
                            <tr key={`${game.id}-issues`}>
                              <td colSpan="5" className="rounded-xl border-2 border-red-300 bg-red-50 p-3 text-sm font-bold text-red-800">
                                {gameIssues.map((issue) => (
                                  <div key={issue}>{issue}</div>
                                ))}
                              </td>
                            </tr>
                          ) : null,
                        ];
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

          {activeScoreEntryMode === "normal" && displayedLines.length === 0 && (
            <div className="rounded-2xl bg-white p-8 text-center text-slate-500 shadow">
              No teams or games generated for this match.
            </div>
          )}
        </div>

        {(scoreEntryEditable || scoreReviewActionsVisible) && (
          <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 p-3 shadow-2xl backdrop-blur md:hidden">
            <div className="mx-auto grid max-w-7xl grid-cols-1 gap-2">
              {scoreEntryEditable && (
                <button
                  type="button"
                  onClick={completeMatch}
                  className="rounded-xl bg-green-700 px-4 py-3 text-base font-bold text-white shadow hover:bg-green-800"
                >
                  {submitScoreLabel}
                </button>
              )}

              {scoreReviewActionsVisible && (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={verifyScores}
                    disabled={scoreValidationSubmitting}
                    className="rounded-xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white shadow hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    {scoreValidationSubmitting ? "Validating..." : "Validate"}
                  </button>

                  <button
                    type="button"
                    onClick={disputeScores}
                    className="rounded-xl bg-red-700 px-4 py-3 text-sm font-bold text-white shadow hover:bg-red-800"
                  >
                    Dispute
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function TeamPlayers({
  title,
  teamRating,
  savedLineups,
  useSavedLineups,
  roster,
  line,
  player1Field,
  player2Field,
  updateLinePlayer,
  applySavedLineup,
  rosterOptionName,
  rosterOptionDisabled = () => false,
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
  const selectedPlayerIds = new Set(
    [line[player1Field], line[player2Field]]
      .filter(Boolean)
      .map(String)
  );
  const rosterOptions = roster.filter((player) =>
    !rosterOptionDisabled(player) ||
    selectedPlayerIds.has(String(player.members?.id || ""))
  );

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-2">
      <h3 className="flex flex-wrap items-center gap-2 text-sm font-bold text-slate-900">
        <span>{title}</span>
        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-800">
          Team Rating: {teamRating}
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

          {rosterOptions.map((player) => {
            const optionDisabled = rosterOptionDisabled(player);

            return (
              <option
                key={player.members?.id}
                value={player.members?.id}
                disabled={optionDisabled}
              >
                {rosterOptionName(player)}
                {optionDisabled ? " - Rating Needed" : ""}
              </option>
            );
          })}
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

          {rosterOptions.map((player) => {
            const optionDisabled = rosterOptionDisabled(player);

            return (
              <option
                key={player.members?.id}
                value={player.members?.id}
                disabled={optionDisabled}
              >
                {rosterOptionName(player)}
                {optionDisabled ? " - Rating Needed" : ""}
              </option>
            );
          })}
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

function formatMatchScoreStatus(match) {
  const status = match?.score_status || "not_entered";

  if (status === "not_entered") return "not_entered";

  const timestamp =
    status === "verified"
      ? match?.score_verified_at
      : match?.score_entered_at;

  return timestamp
    ? `${status} - ${formatDisplayTimestampShort(timestamp)}`
    : status;
}






