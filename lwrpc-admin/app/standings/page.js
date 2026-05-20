"use client";

import LoadingScreen from "../components/LoadingScreen";
import { useCallback, useEffect, useMemo, useState } from "react";
import AppHeader from "../components/AppHeader";
import { requireRole, supabase } from "../lib/auth";
import { hasRole } from "../lib/permissions";
import { useRouter } from "next/navigation";

export default function StandingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  const [leagues, setLeagues] = useState([]);
  const [divisions, setDivisions] = useState([]);
  const [standings, setStandings] = useState([]);
  const [currentRole, setCurrentRole] = useState("player");

  const [selectedLeague, setSelectedLeague] = useState("");
  const [selectedDivision, setSelectedDivision] = useState("");

  const checkAuth = useCallback(async function checkAuth() {
    const user = await requireRole(router, "player");
    if (user?.role) setCurrentRole(user.role);
    return !!user;
  }, [router]);

  const loadData = useCallback(async function loadData() {
    const { data: leagueData } = await supabase
      .from("leagues")
      .select("*")
      .order("name");

    const { data: divisionData } = await supabase
      .from("divisions")
      .select("*")
      .order("sort_order");

    const { data: standingsData } = await supabase
      .from("team_standings")
      .select(`
        *,
        teams (
          id,
          name
        )
      `)
      .order("rank", { ascending: true });

    setLeagues(leagueData || []);
    setDivisions(divisionData || []);
    setStandings(standingsData || []);

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const leagueParam = params.get("league");
      const divisionParam = params.get("division");

      if (leagueParam) setSelectedLeague(leagueParam);
      if (divisionParam) setSelectedDivision(divisionParam);
    }

    setLoading(false);
  }, []);

  function compareTeams(a, b, division) {
    const rules = [
      division.standings_tiebreak_1,
      division.standings_tiebreak_2,
      division.standings_tiebreak_3
    ];

    for (const rule of rules) {
      if ((b[rule] || 0) !== (a[rule] || 0)) {
        return (b[rule] || 0) - (a[rule] || 0);
      }
    }

    return 0;
  }

  async function rebuildStandings() {
    if (!selectedDivision) {
      alert("Select a division");
      return;
    }

    const division = divisions.find(
      d => d.id === selectedDivision
    );

    if (!division) {
      alert("Division not found");
      return;
    }

    const { data: matches, error } = await supabase
      .from("matches")
      .select(`
        *,
        match_lines (
          *,
          winning_team_id,
          home_team_games_won,
          away_team_games_won,
          home_team_points,
          away_team_points
        )
      `)
      .eq("division_id", selectedDivision)
      .eq("status", "completed")
      .order("scheduled_date", {
        ascending: true
      });

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

          recentResults: []
        };
      }

      return standingsMap[teamId];
    }

    matches.forEach(match => {
      const home = ensureTeam(match.home_team_id);
      const away = ensureTeam(match.away_team_id);

      home.matches_played += 1;
      away.matches_played += 1;

      let homeLinesWon = 0;
      let awayLinesWon = 0;

      (match.match_lines || []).forEach(line => {
        const teamSlot = Number(line.line_number || 0);

        if (
          division.number_of_lines &&
          teamSlot > Number(division.number_of_lines)
        ) {
          return;
        }

        const hg =
          Number(line.home_team_games_won || 0);

        const ag =
          Number(line.away_team_games_won || 0);

        const hp =
          Number(line.home_team_points || 0);

        const ap =
          Number(line.away_team_points || 0);

        home.game_wins += hg;
        home.game_losses += ag;

        away.game_wins += ag;
        away.game_losses += hg;

        home.points_for += hp;
        home.points_against += ap;

        away.points_for += ap;
        away.points_against += hp;

        if (
          line.winning_team_id ===
          match.home_team_id
        ) {
          home.line_wins += 1;
          away.line_losses += 1;

          homeLinesWon += 1;
        } else if (
          line.winning_team_id ===
          match.away_team_id
        ) {
          away.line_wins += 1;
          home.line_losses += 1;

          awayLinesWon += 1;
        } else {
          home.line_ties += 1;
          away.line_ties += 1;
        }
      });

      if (homeLinesWon > awayLinesWon) {
        home.match_wins += 1;
        away.match_losses += 1;

        home.home_wins += 1;
        away.away_losses += 1;

        home.standings_points +=
          Number(
            division.standings_win_points || 2
          );

        away.standings_points +=
          Number(
            division.standings_loss_points || 0
          );

        home.recentResults.push("W");
        away.recentResults.push("L");

      } else if (
        awayLinesWon > homeLinesWon
      ) {
        away.match_wins += 1;
        home.match_losses += 1;

        away.away_wins += 1;
        home.home_losses += 1;

        away.standings_points +=
          Number(
            division.standings_win_points || 2
          );

        home.standings_points +=
          Number(
            division.standings_loss_points || 0
          );

        away.recentResults.push("W");
        home.recentResults.push("L");

      } else {
        home.match_ties += 1;
        away.match_ties += 1;

        home.standings_points +=
          Number(
            division.standings_tie_points || 1
          );

        away.standings_points +=
          Number(
            division.standings_tie_points || 1
          );

        home.recentResults.push("T");
        away.recentResults.push("T");
      }
    });

    const ordered = Object.values(
      standingsMap
    ).map(team => {
      team.point_differential =
        team.points_for -
        team.points_against;

      const recent = team.recentResults.slice(-5);

      team.recent_form = recent.join("");

      if (recent.length > 0) {
        const last = recent[recent.length - 1];

        let streak = 0;

        for (
          let i = recent.length - 1;
          i >= 0;
          i--
        ) {
          if (recent[i] === last) {
            streak++;
          } else {
            break;
          }
        }

        team.current_streak =
          last + streak;
      } else {
        team.current_streak = "-";
      }

      delete team.recentResults;

      return team;
    });

    ordered.sort((a, b) =>
      compareTeams(a, b, division)
    );

    ordered.forEach((team, index) => {
      team.rank = index + 1;
      team.updated_at =
        new Date().toISOString();
    });

    await supabase
      .from("team_standings")
      .delete()
      .eq("division_id", selectedDivision);

    const { error: insertError } =
      await supabase
        .from("team_standings")
        .insert(ordered);

    if (insertError) {
      alert(insertError.message);
      return;
    }

    alert("Standings rebuilt");

    loadData();
  }

  useEffect(() => {
    async function run() {
      const ok = await checkAuth();

      if (ok) {
        loadData();
      }
    }

    run();
  }, [checkAuth, loadData]);

  const filteredDivisions = useMemo(() => {
    if (!selectedLeague) return [];

    return divisions.filter(
      d => d.league_id === selectedLeague
    );
  }, [divisions, selectedLeague]);

  const filteredStandings = useMemo(() => {
    return standings.filter(row => {
      if (
        selectedLeague &&
        row.league_id !== selectedLeague
      ) {
        return false;
      }

      if (
        selectedDivision &&
        row.division_id !== selectedDivision
      ) {
        return false;
      }

      return true;
    });
  }, [
    standings,
    selectedLeague,
    selectedDivision
  ]);

if (loading) {
  return <LoadingScreen subtitle="Loading Standings Engine..." />;
}
  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-7xl">

        <AppHeader
          title="League Standings"
          subtitle="Advanced rankings, streaks, tiebreakers, and league standings."
        />

        <div className="rounded-2xl bg-white p-6 shadow">

          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">

            <select
              value={selectedLeague}
              onChange={e => {
                setSelectedLeague(e.target.value);
                setSelectedDivision("");
              }}
              className="rounded-xl border border-slate-300 px-4 py-3"
            >
              <option value="">
                Select League
              </option>

              {leagues.map(league => (
                <option
                  key={league.id}
                  value={league.id}
                >
                  {league.name}
                </option>
              ))}
            </select>

            <select
              value={selectedDivision}
              onChange={e =>
                setSelectedDivision(
                  e.target.value
                )
              }
              className="rounded-xl border border-slate-300 px-4 py-3"
            >
              <option value="">
                Select Division
              </option>

              {filteredDivisions.map(
                division => (
                  <option
                    key={division.id}
                    value={division.id}
                  >
                    {division.name}
                  </option>
                )
              )}
            </select>

            {hasRole(currentRole, "league_manager") && (
              <button
                onClick={rebuildStandings}
                className="rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800"
              >
                Rebuild Standings
              </button>
            )}

          </div>

        </div>

        <div className="mt-6 overflow-hidden rounded-2xl bg-white shadow">

          <table className="w-full border-collapse">

            <thead className="bg-slate-900 text-sm uppercase tracking-wide text-white">

              <tr>

                <th className="p-3 text-left">
                  Rank
                </th>

                <th className="p-3 text-left">
                  Team
                </th>

                <th className="p-3 text-left">
                  W-L-T
                </th>

                <th className="p-3 text-left">
                  Teams
                </th>

                <th className="p-3 text-left">
                  Games
                </th>

                <th className="p-3 text-left">
                  Home
                </th>

                <th className="p-3 text-left">
                  Away
                </th>

                <th className="p-3 text-left">
                  PF
                </th>

                <th className="p-3 text-left">
                  PA
                </th>

                <th className="p-3 text-left">
                  Diff
                </th>

                <th className="p-3 text-left">
                  Form
                </th>

                <th className="p-3 text-left">
                  Streak
                </th>

                <th className="p-3 text-left">
                  Pts
                </th>

              </tr>

            </thead>

            <tbody>

              {filteredStandings.map(team => (
                <tr
                  key={team.id}
                  className="border-b border-slate-100 hover:bg-slate-50"
                >

                  <td className="p-3 font-bold">
                    #{team.rank}
                  </td>

                  <td className="p-3 font-semibold">
                    {team.teams?.name}
                  </td>

                  <td className="p-3">
                    {team.match_wins}-
                    {team.match_losses}-
                    {team.match_ties}
                  </td>

                  <td className="p-3">
                    {team.line_wins}-
                    {team.line_losses}
                  </td>

                  <td className="p-3">
                    {team.game_wins}-
                    {team.game_losses}
                  </td>

                  <td className="p-3">
                    {team.home_wins}-
                    {team.home_losses}
                  </td>

                  <td className="p-3">
                    {team.away_wins}-
                    {team.away_losses}
                  </td>

                  <td className="p-3">
                    {team.points_for}
                  </td>

                  <td className="p-3">
                    {team.points_against}
                  </td>

                  <td className="p-3">
                    {team.point_differential}
                  </td>

                  <td className="p-3 font-mono">
                    {team.recent_form || "-"}
                  </td>

                  <td className="p-3 font-semibold">
                    {team.current_streak || "-"}
                  </td>

                  <td className="p-3 font-bold text-blue-700">
                    {team.standings_points}
                  </td>

                </tr>
              ))}

            </tbody>

          </table>

        </div>

      </div>
    </main>
  );
}
