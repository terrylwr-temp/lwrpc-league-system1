"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../lib/auth";

export default function LiveMatchPage() {
  const { id } = useParams();
  const router = useRouter();

  const [match, setMatch] = useState(null);
  const [lines, setLines] = useState([]);
  const [games, setGames] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);

  async function loadData() {
    const { data: matchData, error: matchError } = await supabase
      .from("matches")
      .select(`
        *,
        divisions(name),
        locations(name),
        home_team:teams!matches_home_team_id_fkey(id, name),
        away_team:teams!matches_away_team_id_fkey(id, name),
        winning_team:teams!matches_winning_team_id_fkey(id, name)
      `)
      .eq("id", id)
      .single();

    if (matchError) {
      console.error(matchError);
      return;
    }

    const { data: lineData, error: lineError } = await supabase
      .from("match_lines")
      .select(`
        *,
        winning_team:teams!match_lines_winning_team_id_fkey(id, name),
        division_lines (
          line_name,
          line_number,
          line_type,
          games_per_line
        ),
        home_player_1:members!match_lines_home_player_1_id_fkey(first_name, last_name),
        home_player_2:members!match_lines_home_player_2_id_fkey(first_name, last_name),
        away_player_1:members!match_lines_away_player_1_id_fkey(first_name, last_name),
        away_player_2:members!match_lines_away_player_2_id_fkey(first_name, last_name)
      `)
      .eq("match_id", id)
      .order("line_number", { ascending: true });

    if (lineError) {
      console.error(lineError);
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
        console.error(error);
        return;
      }

      gameData = data || [];
    }

    setMatch(matchData);
    setLines(lineData || []);
    setGames(gameData);
    setLastUpdated(new Date());
  }

  useEffect(() => {
    if (!id) return;

    loadData();

    const interval = setInterval(() => {
      loadData();
    }, 15000);

    return () => clearInterval(interval);
  }, [id]);

  const matchSummary = useMemo(() => {
    let homeTeams = 0;
    let awayTeams = 0;

    lines.forEach(line => {
      const summary = getLineSummary(line);

      if (summary.homeGameWins > summary.awayGameWins) homeTeams++;
      if (summary.awayGameWins > summary.homeGameWins) awayTeams++;
    });

    let winner = "—";

    if (homeTeams > awayTeams) {
      winner = match?.home_team?.name || "Home";
    }

    if (awayTeams > homeTeams) {
      winner = match?.away_team?.name || "Away";
    }

    return {
      homeTeams,
      awayTeams,
      winner
    };
  }, [lines, games, match]);

  function playerName(player) {
    if (!player) return "—";

    return `${player.first_name || ""} ${player.last_name || ""}`.trim();
  }

  function teamPlayers(line, side) {
    if (side === "home") {
      return [
        playerName(line.home_player_1),
        playerName(line.home_player_2)
      ]
        .filter(name => name !== "—")
        .join(" / ") || "Lineup not posted";
    }

    return [
      playerName(line.away_player_1),
      playerName(line.away_player_2)
    ]
      .filter(name => name !== "—")
      .join(" / ") || "Lineup not posted";
  }

  function getLineSummary(line) {
    const lineGames = games.filter(
      game => game.match_line_id === line.id
    );

    let homeGameWins = 0;
    let awayGameWins = 0;
    let homePoints = 0;
    let awayPoints = 0;
    let completedGames = 0;

    lineGames.forEach(game => {
      if (
        game.home_score !== null &&
        game.away_score !== null
      ) {
        completedGames += 1;

        homePoints += Number(game.home_score || 0);
        awayPoints += Number(game.away_score || 0);

        if (game.home_score > game.away_score) homeGameWins++;
        if (game.away_score > game.home_score) awayGameWins++;
      }
    });

    let winner = "In Progress";

    if (lineGames.length === 0) {
      winner = "Not Started";
    } else if (
      completedGames === lineGames.length &&
      homeGameWins > awayGameWins
    ) {
      winner = match?.home_team?.name || "Home";
    } else if (
      completedGames === lineGames.length &&
      awayGameWins > homeGameWins
    ) {
      winner = match?.away_team?.name || "Away";
    }

    return {
      lineGames,
      homeGameWins,
      awayGameWins,
      homePoints,
      awayPoints,
      completedGames,
      winner
    };
  }

  if (!match) {
    return (
      <main className="min-h-screen bg-slate-950 p-6 text-white">
        Loading live match...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 p-4 text-white md:p-8">
      <div className="mx-auto max-w-7xl">

        <div className="rounded-3xl bg-slate-900 p-6 shadow-2xl">

          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">

            <div>
              <div className="text-sm font-bold uppercase tracking-wide text-slate-400">
                Live Match Mode
              </div>

              <h1 className="mt-2 text-3xl font-black md:text-5xl">
                {match.home_team?.name || "Home"}
                {" vs "}
                {match.away_team?.name || "Away"}
              </h1>

              <div className="mt-3 text-slate-300">
                {match.divisions?.name || "Division"}
                {" · "}
                {match.locations?.name || "Location"}
              </div>

              <div className="mt-1 text-slate-300">
                {match.scheduled_date || "No date"}
                {" · "}
                {match.scheduled_time || "No time"}
              </div>

              <div className="mt-2 text-sm text-slate-400">
                Auto-refreshes every 15 seconds
                {lastUpdated
                  ? ` · Last updated ${lastUpdated.toLocaleTimeString()}`
                  : ""}
              </div>
            </div>

            <div className="rounded-3xl bg-white p-6 text-slate-950">
              <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Match Score
              </div>

              <div className="mt-2 text-6xl font-black">
                {matchSummary.homeTeams}
                {" - "}
                {matchSummary.awayTeams}
              </div>

              <div className="mt-2 text-sm font-bold text-slate-700">
                Leader: {matchSummary.winner}
              </div>
            </div>

          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={() => router.push(`/score-entry/${id}`)}
              className="rounded-2xl bg-green-600 px-5 py-3 font-bold text-white hover:bg-green-700"
            >
              Score Entry
            </button>

            <button
              onClick={() => router.push(`/matches/${id}`)}
              className="rounded-2xl bg-slate-700 px-5 py-3 font-bold text-white hover:bg-slate-600"
            >
              Match Operations
            </button>

            <button
              onClick={loadData}
              className="rounded-2xl bg-blue-600 px-5 py-3 font-bold text-white hover:bg-blue-700"
            >
              Refresh Now
            </button>
          </div>

        </div>

        <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">

          {lines.map(line => {
            const summary = getLineSummary(line);

            return (
              <div
                key={line.id}
                className="rounded-3xl bg-white p-5 text-slate-950 shadow-xl"
              >
                <div className="flex items-start justify-between gap-4">

                  <div>
                    <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
                      Game {line.line_number}
                    </div>

                    <h2 className="mt-1 text-2xl font-black">
                      {line.division_lines?.line_name ||
                        line.division_lines?.line_type ||
                        "Match Team"}
                    </h2>

                    <div className="mt-2 text-sm text-slate-500">
                      {summary.completedGames}
                      {" / "}
                      {summary.lineGames.length}
                      {" games entered"}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-slate-900 px-5 py-4 text-center text-white">
                    <div className="text-xs uppercase tracking-wide text-slate-400">
                      Team Score
                    </div>

                    <div className="text-3xl font-black">
                      {summary.homeGameWins}
                      {" - "}
                      {summary.awayGameWins}
                    </div>
                  </div>

                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">

                  <TeamPanel
                    team={match.home_team?.name || "Home"}
                    players={teamPlayers(line, "home")}
                    gameWins={summary.homeGameWins}
                    points={summary.homePoints}
                  />

                  <TeamPanel
                    team={match.away_team?.name || "Away"}
                    players={teamPlayers(line, "away")}
                    gameWins={summary.awayGameWins}
                    points={summary.awayPoints}
                  />

                </div>

                <div className="mt-5 space-y-2">

                  {summary.lineGames.map(game => (
                    <div
                      key={game.id}
                      className="grid grid-cols-3 items-center rounded-2xl bg-slate-100 p-3"
                    >
                      <div className="font-bold text-slate-700">
                        Game {game.game_number}
                      </div>

                      <div className="text-center text-2xl font-black">
                        {game.home_score ?? "—"}
                        {" - "}
                        {game.away_score ?? "—"}
                      </div>

                      <div className="text-right text-sm font-bold text-slate-600">
                        {game.home_score == null ||
                        game.away_score == null
                          ? "Pending"
                          : game.home_score > game.away_score
                            ? match.home_team?.name
                            : match.away_team?.name}
                      </div>
                    </div>
                  ))}

                  {summary.lineGames.length === 0 && (
                    <div className="rounded-2xl bg-slate-100 p-5 text-center text-slate-500">
                      No games generated yet.
                    </div>
                  )}

                </div>

                <div className="mt-5 rounded-2xl bg-slate-900 p-4 text-white">
                  <div className="text-xs uppercase tracking-wide text-slate-400">
                    Current Team Winner
                  </div>

                  <div className="mt-1 text-xl font-black">
                    {summary.winner}
                  </div>
                </div>

              </div>
            );
          })}

          {lines.length === 0 && (
            <div className="rounded-3xl bg-white p-8 text-center text-slate-500">
              No teams generated for this match.
            </div>
          )}

        </div>

      </div>
    </main>
  );
}

function TeamPanel({ team, players, gameWins, points }) {
  return (
    <div className="rounded-2xl bg-slate-100 p-4">
      <div className="text-sm font-black text-slate-900">
        {team}
      </div>

      <div className="mt-1 text-xs text-slate-600">
        {players}
      </div>

      <div className="mt-4 flex items-end justify-between">
        <div>
          <div className="text-xs font-bold uppercase text-slate-500">
            Games
          </div>

          <div className="text-3xl font-black">
            {gameWins}
          </div>
        </div>

        <div className="text-right">
          <div className="text-xs font-bold uppercase text-slate-500">
            Points
          </div>

          <div className="text-2xl font-black">
            {points}
          </div>
        </div>
      </div>
    </div>
  );
}



