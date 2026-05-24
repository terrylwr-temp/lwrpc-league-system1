"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { requireRole, supabase } from "../../lib/auth";
import { formatDisplayDate, formatDisplayTime } from "../../lib/dateTime";
import { splitNotificationRecipients } from "../../lib/notificationPreferences";

export default function MobileScoreEntryPage() {
  const { id } = useParams();
  const router = useRouter();

  const [match, setMatch] = useState(null);
  const [lines, setLines] = useState([]);
  const [games, setGames] = useState([]);
  const [currentUserMember, setCurrentUserMember] = useState(null);

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
          co_captain_2_member_id
        ),
        away_team:teams!matches_away_team_id_fkey(
          id,
          name,
          captain_member_id,
          co_captain_member_id,
          co_captain_2_member_id
        ),
        locations(name),
        divisions(name)
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
        division_lines (
          line_name,
          line_number,
          line_type,
          games_per_line
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

    setMatch(matchData);
    setLines(lineData || []);
    setGames(gameData);
  }, [id]);

  async function updateGame(gameId, field, value) {
    const { error } = await supabase
      .from("line_games")
      .update({
        [field]: value === "" ? null : Number(value),
        updated_at: new Date().toISOString()
      })
      .eq("id", gameId);

    if (error) {
      alert(error.message);
      return;
    }

    loadData();
  }

  function getLineSummary(line) {
    const lineGames = games.filter(
      game => game.match_line_id === line.id
    );

    let homeGameWins = 0;
    let awayGameWins = 0;
    let homePoints = 0;
    let awayPoints = 0;

    lineGames.forEach(game => {
      if (
        game.home_score !== null &&
        game.away_score !== null
      ) {
        homePoints += Number(game.home_score || 0);
        awayPoints += Number(game.away_score || 0);

        if (game.home_score > game.away_score) homeGameWins++;
        if (game.away_score > game.home_score) awayGameWins++;
      }
    });

    let winner = "—";

    if (homeGameWins > awayGameWins) {
      winner = match?.home_team?.name || "Home";
    }

    if (awayGameWins > homeGameWins) {
      winner = match?.away_team?.name || "Away";
    }

    return {
      homeGameWins,
      awayGameWins,
      homePoints,
      awayPoints,
      winner
    };
  }

  async function submitScores() {
    for (const line of lines) {
      const summary = getLineSummary(line);

      let winningTeamId = null;

      if (summary.homeGameWins > summary.awayGameWins) {
        winningTeamId = match.home_team_id;
      }

      if (summary.awayGameWins > summary.homeGameWins) {
        winningTeamId = match.away_team_id;
      }

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

    lines.forEach(line => {
      const summary = getLineSummary(line);

      if (summary.homeGameWins > summary.awayGameWins) homeLines++;
      if (summary.awayGameWins > summary.homeGameWins) awayLines++;
    });

    let winningTeamId = null;

    if (homeLines > awayLines) {
      winningTeamId = match.home_team_id;
    }

    if (awayLines > homeLines) {
      winningTeamId = match.away_team_id;
    }

    const { error } = await supabase
      .from("matches")
      .update({
        status: "completed",
        score_status: "pending_verification",
        home_score: homeLines,
        away_score: awayLines,
        winning_team_id: winningTeamId,
        score_entered_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    await sendScoreSubmittedNotification(homeLines, awayLines);

    alert("Scores submitted for verification and opposing captains notified.");

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
      ]);

      if (emails.length === 0 && phones.length === 0) return;

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

            const summary = getLineSummary(line);

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
                      {line.division_lines?.line_name || line.division_lines?.line_type || "Team"}
                    </div>
                  </div>

                  <div className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-bold text-slate-900">
                    {summary.homeGameWins}-{summary.awayGameWins}
                  </div>
                </div>

                {lineGames.length === 0 && (
                  <div className="mt-4 rounded-xl bg-slate-50 p-4 text-center text-sm text-slate-500">
                    No game score rows found for this team. Regenerate this match from Scheduling if this is unexpected.
                  </div>
                )}

                <div className="mt-4 space-y-3">
                  {lineGames.map(game => (
                    <div
                      key={game.id}
                      className="rounded-xl border border-slate-200 p-3"
                    >
                      <div className="mb-2 text-sm font-bold text-slate-700">
                        Game {game.game_number}
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="mb-1 block text-xs font-semibold text-slate-500">
                            {match.home_team?.name}
                          </label>

                          <input
                            type="number"
                            inputMode="numeric"
                            value={game.home_score ?? ""}
                            onChange={e =>
                              updateGame(
                                game.id,
                                "home_score",
                                e.target.value
                              )
                            }
                            className="w-full rounded-xl border border-slate-300 px-4 py-4 text-center text-2xl font-bold"
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-xs font-semibold text-slate-500">
                            {match.away_team?.name}
                          </label>

                          <input
                            type="number"
                            inputMode="numeric"
                            value={game.away_score ?? ""}
                            onChange={e =>
                              updateGame(
                                game.id,
                                "away_score",
                                e.target.value
                              )
                            }
                            className="w-full rounded-xl border border-slate-300 px-4 py-4 text-center text-2xl font-bold"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
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
            onClick={() => router.push(`/matches/${id}`)}
            className="mt-3 w-full rounded-2xl bg-slate-200 px-5 py-3 font-semibold text-slate-900"
          >
            Full Match View
          </button>
        </div>

      </div>
    </main>
  );
}



