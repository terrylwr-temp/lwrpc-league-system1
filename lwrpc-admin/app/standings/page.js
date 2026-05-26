"use client";

import LoadingScreen from "../components/LoadingScreen";
import { useCallback, useEffect, useMemo, useState } from "react";
import AppHeader from "../components/AppHeader";
import { requireRole, supabase } from "../lib/auth";
import { hasRole } from "../lib/permissions";
import { rebuildDivisionStandingsForDivision } from "../lib/standingsRebuild";
import { useRouter } from "next/navigation";

export default function StandingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  const [leagues, setLeagues] = useState([]);
  const [divisions, setDivisions] = useState([]);
  const [standings, setStandings] = useState([]);
  const [selectedLeague, setSelectedLeague] = useState("");
  const [selectedDivision, setSelectedDivision] = useState("");
  const [currentUserRole, setCurrentUserRole] = useState("player");
  const [rebuilding, setRebuilding] = useState(false);

  const checkAuth = useCallback(async function checkAuth() {
    const user = await requireRole(router, "player");
    if (user?.role) setCurrentUserRole(user.role);
    return !!user;
  }, [router]);

  const loadData = useCallback(async function loadData() {
    const { data: leagueData } = await supabase
      .from("leagues")
      .select("*, seasons(is_active)")
      .order("name", { ascending: true });

    const { data: divisionData } = await supabase
      .from("divisions")
      .select("*")
      .order("name", { ascending: true });

    const { data: standingsData } = await supabase
      .from("team_standings")
      .select(`
        *,
        teams (
          id,
          name,
          is_active
        )
      `)
      .order("rank", { ascending: true });

    setLeagues((leagueData || []).filter((league) => league.is_active !== false && league.seasons?.is_active !== false));
    setDivisions((divisionData || []).filter((division) => division.is_active !== false));
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
    ).sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }, [divisions, selectedLeague]);

  const sortedLeagues = useMemo(() => {
    return [...leagues].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }, [leagues]);

  const filteredStandings = useMemo(() => {
    if (!selectedLeague || !selectedDivision) return [];

    return standings.filter(row => {
      if (row.league_id !== selectedLeague) {
        return false;
      }

      if (row.division_id !== selectedDivision) {
        return false;
      }

      return row.teams?.is_active !== false;
    });
  }, [
    standings,
    selectedLeague,
    selectedDivision
  ]);

  async function rebuildLeagueStatistics() {
    if (!selectedDivision) {
      alert("Select a division before rebuilding statistics.");
      return;
    }

    const selectedDivisionName =
      divisions.find((division) => String(division.id) === String(selectedDivision))?.name || "this division";
    const confirmation = prompt(
      `This will recalculate match scores, W-L-T, points, and rankings for ${selectedDivisionName} using verified matches only.\n\nType REBUILD to continue.`
    );

    if (confirmation !== "REBUILD") return;

    setRebuilding(true);
    const result = await rebuildDivisionStandingsForDivision(supabase, selectedDivision);
    setRebuilding(false);

    if (!result.success) {
      alert(result.error || "Unable to rebuild league statistics.");
      return;
    }

    await loadData();
    alert(`League statistics rebuilt for ${result.teams} teams from ${result.matches} verified matches.`);
  }

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

              {sortedLeagues.map(league => (
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

            {hasRole(currentUserRole, "league_manager") && (
              <button
                type="button"
                onClick={rebuildLeagueStatistics}
                disabled={!selectedDivision || rebuilding}
                className="rounded-xl bg-slate-900 px-4 py-3 font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {rebuilding ? "Rebuilding..." : "Rebuild League Statistics"}
              </button>
            )}

          </div>

        </div>

        {!selectedLeague || !selectedDivision ? (
          <div className="mt-6 rounded-2xl bg-white p-8 text-center text-slate-500 shadow">
            Select both a league and division to view standings.
          </div>
        ) : (
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
        )}

      </div>
    </main>
  );
}
