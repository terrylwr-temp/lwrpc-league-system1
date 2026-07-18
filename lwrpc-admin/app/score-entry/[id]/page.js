"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getRequestAuthorizationHeaders, requireRole, supabase } from "../../lib/auth";
import { formatDisplayDate, formatDisplayTime } from "../../lib/dateTime";
import { splitNotificationRecipients } from "../../lib/notificationPreferences";
import { confirmUnsavedChanges, useUnsavedChangesWarning } from "../../lib/useUnsavedChangesWarning";
import { currentMemberRating, divisionRatingIssue } from "../../lib/ratingEligibility";
import {
  gameHasScoreEntry as sharedGameHasScoreEntry,
  getLineSummary as sharedGetLineSummary,
  isPicklebreakerLine as sharedIsPicklebreakerLine,
  lineRequiresValidation as sharedLineRequiresValidation,
  lineScoreRequired as sharedLineScoreRequired,
  matchPointSummary,
  picklebreakerValidationIssues,
  requiredLineGameIds as sharedRequiredLineGameIds,
} from "../../lib/matchScoring";

export default function MobileScoreEntryPage() {
  const { id } = useParams();
  const router = useRouter();

  const [match, setMatch] = useState(null);
  const [lines, setLines] = useState([]);
  const [games, setGames] = useState([]);
  const [seasonRatings, setSeasonRatings] = useState([]);
  const [currentUserMember, setCurrentUserMember] = useState(null);
  const [scoreDirty, setScoreDirty] = useState(false);
  const pendingGameUpdatesRef = useRef(new Map());

  useUnsavedChangesWarning(scoreDirty, "match scores");

  const checkAuth = useCallback(async function checkAuth() {
    const user = await requireRole(router, "captain");
    return !!user;
  }, [router]);

  const loadData = useCallback(async function loadData() {
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
        locations(name),
        leagues(id, season_id),
        divisions(name, rating_type, min_dupr, max_dupr, team_dupr_max)
      `)
      .eq("id", id)
      .single();

    if (matchError) {
      alert(matchError.message);
      return;
    }

    const { data: lineData, error: lineError } = await supabase
      .from("match_lines")
      .select(`
        *,
        home_player_1:members!match_lines_home_player_1_id_fkey(id, first_name, last_name, self_rating),
        home_player_2:members!match_lines_home_player_2_id_fkey(id, first_name, last_name, self_rating),
        away_player_1:members!match_lines_away_player_1_id_fkey(id, first_name, last_name, self_rating),
        away_player_2:members!match_lines_away_player_2_id_fkey(id, first_name, last_name, self_rating),
        division_lines (
          line_name,
          line_number,
          line_type,
          posted_to_dupr,
          games_per_line,
          points_to_win,
          win_by,
          team_win_points,
          picklebreaker_not_played_points,
          picklebreaker_not_played_award_rule,
          picklebreaker_play_rule,
          standings_points_mode,
          score_required
        )
      `)
      .eq("match_id", id)
      .order("line_number", { ascending: true });

    if (lineError) {
      alert(lineError.message);
      return;
    }

    const lineIds = (lineData || []).map(line => line.id);

    let gameData = [];

    if (lineIds.length > 0) {
      const { data, error } = await supabase
        .from("line_games")
        .select("*")
        .in("match_line_id", lineIds)
        .order("game_number", { ascending: true });

      if (error) {
        alert(error.message);
        return;
      }

      gameData = data || [];
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
        return;
      }

      ratingData = data || [];
    }

    setMatch(matchData);
    setLines(lineData || []);
    setGames(gameData);
    setSeasonRatings(ratingData);
  }, [id]);

  async function loadCurrentSeasonRatings() {
    const seasonId = match?.leagues?.season_id;
    if (!seasonId) return [];

    const { data, error } = await supabase
      .from("member_season_ratings")
      .select("*")
      .eq("season_id", seasonId);

    if (error) {
      throw new Error("Current player ratings could not be verified: " + error.message);
    }

    return data || [];
  }

  function ratingLabel() {
    const ratingType = match?.divisions?.rating_type || "dupr";
    if (ratingType === "primetime") return "PT";
    if (ratingType === "self_rating") return "Self";
    return "DUPR";
  }

  function memberRating(member, ratings = seasonRatings) {
    if (!member) return null;
    const ratingType = match?.divisions?.rating_type || "dupr";
    const ratingRow = ratings.find((row) => String(row.member_id) === String(member.id));
    return currentMemberRating(member, ratingRow, ratingType);
  }

  function memberRatingIssue(member, ratings = seasonRatings) {
    const playerName = ((member?.first_name || "") + " " + (member?.last_name || "")).trim() || "Selected player";
    return divisionRatingIssue({
      rating: memberRating(member, ratings),
      minRating: match?.divisions?.min_dupr,
      maxRating: match?.divisions?.max_dupr,
      ratingLabel: ratingLabel(),
      playerName,
    });
  }

  function lineRatingIssues(line, ratings = seasonRatings) {
    return [...new Set([
      line.home_player_1,
      line.home_player_2,
      line.away_player_1,
      line.away_player_2,
    ].filter(Boolean).map((member) => memberRatingIssue(member, ratings)).filter(Boolean))];
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
            updated_at: new Date().toISOString()
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
    const game = games.find((item) => String(item.id) === String(gameId));
    const line = lines.find((item) => String(item.id) === String(game?.match_line_id));
    const ratingIssues = line ? lineRatingIssues(line) : [];

    if (ratingIssues.length > 0) {
      alert(["Scores cannot be entered for this game line until player ratings are eligible:", "", ...ratingIssues.map((issue) => "- " + issue)].join("\n"));
      return;
    }

    const numericValue = String(value).replace(/\D/g, "");
    const normalizedValue = numericValue === "" ? null : Number(numericValue);

    setScoreDirty(true);

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

    await queueGameUpdate(gameId, field, normalizedValue);
  }

  function getLineSummary(line) {
    const summary = sharedGetLineSummary(line, games.filter((game) => game.match_line_id === line.id), match);
    return {
      ...summary,
      winner: summary.winnerName || "—",
    };
  }

  function lineTeamWinPoints(line, summary) {
    return matchPointSummary(lines, games, match).pointsByLineId[String(line.id)] || { home: 0, away: 0, mode: "unawarded", pointAwardTeamId: summary?.winningTeamId || null };
  }

  function isForfeitStatus(status) {
    return status === "forfeit_home" || status === "forfeit_away";
  }

  function isRetiredStatus(status) {
    return status === "retired_home" || status === "retired_away";
  }

  function lineScoreRequired(line) {
    return sharedLineScoreRequired(line);
  }

  function gameHasScoreEntry(game) {
    return sharedGameHasScoreEntry(game);
  }

  function lineRequiresValidation(line, lineGames) {
    return sharedLineRequiresValidation(line, lineGames);
  }

  function requiredLineGameIds(lineGames, line = null) {
    return sharedRequiredLineGameIds(lineGames, line);
  }

  function lineScoreValidationIssues(line, ratings = seasonRatings) {
    const pointsToWin = Number(line.division_lines?.points_to_win || 0);
    const winBy = Number(line.division_lines?.win_by || 0);
    const lineGames = games.filter((game) => game.match_line_id === line.id);
    const lineLabel = line.division_lines?.line_name || `Line ${line.line_number}`;
    const issues = [];
    const requiredGameIds = requiredLineGameIds(lineGames, line);
    const picklebreakerIssues = sharedIsPicklebreakerLine(line)
      ? picklebreakerValidationIssues(lines, games, match, (item) => item.division_lines?.line_name || `Line ${item.line_number}`)
          .filter((issue) => String(issue.lineId || "") === String(line.id))
          .map((issue) => issue.message)
      : [];

    if (picklebreakerIssues.length > 0) return picklebreakerIssues;

    if (sharedIsPicklebreakerLine(line) && !lineGames.some(gameHasScoreEntry)) {
      return issues;
    }

    const shouldValidateLine = lineRequiresValidation(line, lineGames);

    if (shouldValidateLine) {
      issues.push(...lineRatingIssues(line, ratings).map((issue) => lineLabel + ": " + issue));
    }

    lineGames.forEach((game) => {
      if (!requiredGameIds.has(String(game.id))) return;
      if (!shouldValidateLine) return;

      const status = game.game_status && game.game_status !== "scheduled" ? game.game_status : "completed";
      const gameLabel = `${lineLabel} Game ${game.game_number || ""}`.trim();
      const addIssue = (message) => issues.push(`${gameLabel}: ${message}`);

      if (isForfeitStatus(status)) return;

      if (game.home_score === null || game.home_score === undefined || game.away_score === null || game.away_score === undefined) {
        addIssue("both scores are required unless the result is a forfeit.");
        return;
      }

      if (isRetiredStatus(status) || pointsToWin <= 0) return;

      const homeScore = Number(game.home_score || 0);
      const awayScore = Number(game.away_score || 0);
      const highScore = Math.max(homeScore, awayScore);
      const lowScore = Math.min(homeScore, awayScore);

      if (winBy === 1) {
        if (highScore > pointsToWin) {
          addIssue(`Win By 1 games cannot have a score higher than ${pointsToWin}.`);
        }

        if (homeScore !== pointsToWin && awayScore !== pointsToWin) {
          addIssue(`Win By 1 games must have one team score exactly ${pointsToWin}.`);
        }

        return;
      }

      if (highScore < pointsToWin) {
        addIssue(`at least one score must be ${pointsToWin} or higher for a completed game.`);
      }

      if (winBy > 0 && highScore - lowScore < winBy) {
        addIssue(`winning margin must be at least ${winBy}.`);
      }
    });

    return issues;
  }

  function scoreValidationIssues(ratings = seasonRatings) {
    return lines.flatMap((line) => lineScoreValidationIssues(line, ratings));
  }


  async function submitScores() {
    await flushPendingGameUpdates();

    let currentRatings;
    try {
      currentRatings = await loadCurrentSeasonRatings();
    } catch (error) {
      alert(error.message);
      return;
    }

    setSeasonRatings(currentRatings);
    const validationIssues = scoreValidationIssues(currentRatings);

    if (validationIssues.length > 0) {
      alert(`Fix these scores before submitting:\n\n${validationIssues.join("\n")}`);
      return;
    }

    for (const line of lines) {
      const summary = getLineSummary(line);
      const linePoints = lineTeamWinPoints(line, summary);
      const winningTeamId = sharedIsPicklebreakerLine(line) && linePoints.mode === "not_played"
        ? linePoints.pointAwardTeamId
        : summary.winningTeamId;

      const { error } = await supabase
        .from("match_lines")
        .update({
          winning_team_id: winningTeamId,
          home_team_games_won: summary.homeGameWins,
          away_team_games_won: summary.awayGameWins,
          home_team_points: summary.homePoints,
          away_team_points: summary.awayPoints,
          updated_at: new Date().toISOString()
        })
        .eq("id", line.id);

      if (error) {
        alert(error.message);
        return;
      }
    }

    let homeLines = 0;
    let awayLines = 0;
    const pointSummary = matchPointSummary(lines, games, match);
    homeLines = pointSummary.homeWins;
    awayLines = pointSummary.awayWins;

    let winningTeamId = null;
    winningTeamId = pointSummary.winningTeamId;

    const { error } = await supabase
      .from("matches")
      .update({
        status: "completed",
        score_status: "pending_verification",
        home_score: homeLines,
        away_score: awayLines,
        winning_team_id: winningTeamId,
        score_entered_by_member_id: currentUserMember?.id || null,
        score_entered_at: new Date().toISOString(),
        score_verified_by_member_id: null,
        score_verified_at: null,
        finalized_at: null,
        updated_at: new Date().toISOString()
      })
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    await sendScoreSubmittedNotification(homeLines, awayLines);

    alert("Scores submitted for verification and opposing captains notified.");

    setScoreDirty(false);
    router.push(`/matches/${id}`);
  }

  async function sendScoreSubmittedNotification(homeLines, awayLines) {
    try {
      const opposingTeamId = opposingTeamIdForCurrentUser();

      if (!opposingTeamId) return;

      const { data: opposingTeam, error } = await supabase
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
        .eq("id", opposingTeamId)
        .single();

      if (error) {
        console.error(error);
        return;
      }

      const { emails, phones } = splitNotificationRecipients([
        opposingTeam?.captain,
        opposingTeam?.co_captain_1,
        opposingTeam?.co_captain_2,
        opposingTeam?.club_pro,
      ]);

      if (emails.length === 0 && phones.length === 0) return;

      await fetch("/api/score-notification", {
        method: "POST",
        headers: await getRequestAuthorizationHeaders({
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({
          emails,
          phones,
          homeTeam: match.home_team?.name,
          awayTeam: match.away_team?.name,
          score: `${homeLines}-${awayLines}`,
          matchDate: match.scheduled_date,
          enteredBy: currentUserMember
            ? `${currentUserMember.first_name} ${currentUserMember.last_name}`
            : "Unknown",
          notificationType: "submitted",
        }),
      });
    } catch (error) {
      console.error("Score notification send failed", error);
    }
  }

  function opposingTeamIdForCurrentUser() {
    const memberId = currentUserMember?.id;
    if (!memberId || !match) return "";

    const homeCaptainIds = [
      match.home_team?.captain_member_id,
      match.home_team?.co_captain_member_id,
      match.home_team?.co_captain_2_member_id,
      match.home_team?.club_pro_member_id,
    ].filter(Boolean);

    if (homeCaptainIds.some((captainId) => String(captainId) === String(memberId))) {
      return match.away_team_id;
    }

    return match.home_team_id;
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

  if (!match) {
    return (
      <main className="min-h-screen bg-slate-100 p-4">
        Loading score entry...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4">
      <div className="mx-auto max-w-xl">

        <div className="rounded-2xl bg-slate-900 p-5 text-white shadow">
          <div className="text-xs uppercase tracking-wide text-slate-300">
            Mobile Score Entry
          </div>

          <h1 className="mt-2 text-2xl font-bold">
            {match.home_team?.name} vs {match.away_team?.name}
          </h1>

          <div className="mt-2 text-sm text-slate-300">
            {match.divisions?.name || "Division"} · {match.locations?.name || "Location"}
          </div>

          <div className="mt-1 text-sm text-slate-300">
            {formatDisplayDate(match.scheduled_date, "No date")} · {formatDisplayTime(match.scheduled_time, "No time")}
          </div>
        </div>

        <div className="mt-4 space-y-4">
          {lines.map(line => {
            const lineGames = games.filter(
              game => game.match_line_id === line.id
            );
            const requiredGameIdsForLine = requiredLineGameIds(lineGames, line);

            const summary = getLineSummary(line);
            const ratingIssues = lineRatingIssues(line);

            return (
              <div
                key={line.id}
                className="rounded-2xl bg-white p-4 shadow"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">
                      Game {line.line_number}
                    </h2>

                    <div className="mt-1 text-sm text-slate-600">
                      {line.division_lines?.line_name || line.division_lines?.line_type || "Team"} · {duprPostedLabel(line)} · {lineScoreRequired(line) ? "Required" : "Optional"}
                    </div>
                  </div>

                  <div className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-bold text-slate-900">
                    {summary.homeGameWins}-{summary.awayGameWins}
                  </div>
                </div>

                {ratingIssues.length > 0 && (
                  <div className="mt-4 rounded-xl border border-red-300 bg-red-50 p-3 text-sm font-bold text-red-900">
                    <div className="mb-1">Player rating eligibility must be corrected before scores can be entered:</div>
                    {ratingIssues.map((issue) => <div key={issue}>{issue}</div>)}
                  </div>
                )}

                {lineGames.length === 0 && (
                  <div className="mt-4 rounded-xl bg-slate-50 p-4 text-center text-sm text-slate-500">
                    No game score rows found for this team. Regenerate this match from Scheduling if this is unexpected.
                  </div>
                )}

                <div className="mt-4 space-y-3">
                  {lineGames.map(game => {
                    const gameNeeded = requiredGameIdsForLine.has(String(game.id));

                    return (
                    <div
                      key={game.id}
                      className={`overflow-hidden rounded-2xl border-2 shadow-md ring-1 ring-white ${
                        gameNeeded ? "border-blue-200 bg-blue-50/70" : "border-slate-300 bg-slate-100"
                      }`}
                    >
                      <div className={`flex items-center justify-between gap-2 border-b px-4 py-3 text-sm font-black uppercase tracking-wide ${
                        gameNeeded ? "border-blue-200 bg-white/80 text-blue-950" : "border-slate-300 bg-slate-200 text-slate-700"
                      }`}>
                        <span>Game {game.game_number} Scores</span>
                        {!gameNeeded && <span className="rounded-full bg-white px-3 py-1 text-xs text-slate-700">Not needed</span>}
                      </div>

                      <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2">
                        <div>
                          <label className="mb-1 block min-h-8 text-xs font-black uppercase tracking-wide text-slate-700">
                            {match.home_team?.name}
                          </label>

                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={game.home_score ?? ""}
                            disabled={!gameNeeded}
                            onChange={e =>
                              updateGame(
                                game.id,
                                "home_score",
                                e.target.value
                              )
                            }
                            className="w-full rounded-2xl border-2 border-slate-300 bg-white px-4 py-4 text-center text-3xl font-black text-slate-950 shadow-inner outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
                          />
                        </div>

                        <div>
                          <label className="mb-1 block min-h-8 text-xs font-black uppercase tracking-wide text-slate-700">
                            {match.away_team?.name}
                          </label>

                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={game.away_score ?? ""}
                            disabled={!gameNeeded}
                            onChange={e =>
                              updateGame(
                                game.id,
                                "away_score",
                                e.target.value
                              )
                            }
                            className="w-full rounded-2xl border-2 border-slate-300 bg-white px-4 py-4 text-center text-3xl font-black text-slate-950 shadow-inner outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
                          />
                        </div>
                      </div>
                    </div>
                    );
                  })}
                </div>

                <div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
                  Winner: <span className="font-bold">{summary.winner}</span>
                  <br />
                  Points: {summary.homePoints} - {summary.awayPoints}
                </div>

              </div>
            );
          })}
        </div>

        <div className="sticky bottom-0 mt-6 bg-slate-100 py-4">
          <button
            onClick={submitScores}
            className="w-full rounded-2xl bg-green-700 px-5 py-4 text-lg font-bold text-white shadow-lg"
          >
            Submit Scores For Verification
          </button>

          <button
            onClick={() => {
              if (confirmUnsavedChanges()) router.push(`/matches/${id}`);
            }}
            className="mt-3 w-full rounded-2xl bg-slate-200 px-5 py-3 font-semibold text-slate-900"
          >
            Full Match View
          </button>
        </div>

      </div>
    </main>
  );
}

function duprPostedLabel(line) {
  const posted = line?.posted_to_dupr ?? line?.division_lines?.posted_to_dupr;
  return posted ? "Posted to DUPR" : "Not Posted to DUPR";
}



