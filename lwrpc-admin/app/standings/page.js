"use client";

import LoadingScreen from "../components/LoadingScreen";
import { useCallback, useEffect, useMemo, useState } from "react";
import AppHeader from "../components/AppHeader";
import TeamScheduleModal from "../components/TeamScheduleModal";
import { requireRole, supabase } from "../lib/auth";
import { rebuildDivisionStandingsForDivision } from "../lib/standingsRebuild";
import { sortStandingsByDivisionRules } from "../lib/standingsSort";
import { defaultDashboardForRole } from "../lib/permissions";
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
  const [divisionScheduleTeam, setDivisionScheduleTeam] = useState(null);
  const [divisionScheduleTeams, setDivisionScheduleTeams] = useState([]);
  const [divisionScheduleMatches, setDivisionScheduleMatches] = useState([]);
  const [divisionScheduleByes, setDivisionScheduleByes] = useState([]);
  const [divisionScheduleRatings, setDivisionScheduleRatings] = useState([]);
  const [divisionScheduleLoading, setDivisionScheduleLoading] = useState(false);

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
      .select("*, leagues(id, name, season_id)")
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

  const selectedDivisionRow = useMemo(() => {
    return divisions.find((division) => String(division.id) === String(selectedDivision)) || null;
  }, [divisions, selectedDivision]);

  const filteredStandings = useMemo(() => {
    if (!selectedLeague || !selectedDivision) return [];

    const visibleRows = standings.filter(row => {
      if (row.league_id !== selectedLeague) {
        return false;
      }

      if (row.division_id !== selectedDivision) {
        return false;
      }

      return row.teams?.is_active !== false;
    });

    return sortStandingsByDivisionRules(visibleRows, selectedDivisionRow);
  }, [
    standings,
    selectedLeague,
    selectedDivision,
    selectedDivisionRow
  ]);

  const playoffTeamCount = Number(selectedDivisionRow?.playoff_team_count || 0);
  const playoffTeamIds = useMemo(() => {
    return new Set(
      filteredStandings
        .slice(0, playoffTeamCount > 0 ? playoffTeamCount : 0)
        .map((team) => String(team.team_id || team.id))
    );
  }, [filteredStandings, playoffTeamCount]);

  function isPlayoffTeam(team) {
    return playoffTeamIds.has(String(team.team_id || team.id));
  }

  const canRebuildLeagueStatistics =
    currentUserRole === "league_manager" || currentUserRole === "commissioner";

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

  async function openDivisionSchedule(standingRow) {
    const team = {
      ...(standingRow.teams || {}),
      division_id: standingRow.division_id,
      divisions: selectedDivisionRow,
      standing: standingRow,
    };

    if (!team.id || !team.division_id) {
      alert("This team is not assigned to a division.");
      return;
    }

    setDivisionScheduleTeam(team);
    setDivisionScheduleTeams([]);
    setDivisionScheduleMatches([]);
    setDivisionScheduleByes([]);
    setDivisionScheduleRatings([]);
    setDivisionScheduleLoading(true);

    const seasonId = selectedDivisionRow?.leagues?.season_id;
    const [
      { data: divisionTeams, error: teamsError },
      { data: divisionMatches, error: matchesError },
      { data: divisionByes, error: byesError },
      { data: divisionStandings, error: standingsError },
      { data: divisionRatings, error: ratingsError },
    ] = await Promise.all([
      supabase
        .from("teams")
        .select("id, name, division_id, locations(id, name)")
        .eq("division_id", team.division_id)
        .order("name", { ascending: true }),
      supabase
        .from("matches")
        .select(`
          id,
          league_id,
          division_id,
          home_team_id,
          away_team_id,
          location_id,
          scheduled_date,
          scheduled_time,
          week_number,
          status,
          score_status,
          score_entered_at,
          score_verified_at,
          home_score,
          away_score,
          winning_team_id,
          is_published,
          locations (
            id,
            name
          ),
          home_team:teams!matches_home_team_id_fkey (
            id,
            name
          ),
          away_team:teams!matches_away_team_id_fkey (
            id,
            name
          ),
          match_lines (
            id,
            line_number,
            home_team_games_won,
            away_team_games_won,
            division_lines (
              line_name
            ),
            home_player_1:members!match_lines_home_player_1_id_fkey(id, first_name, last_name, self_rating),
            home_player_2:members!match_lines_home_player_2_id_fkey(id, first_name, last_name, self_rating),
            away_player_1:members!match_lines_away_player_1_id_fkey(id, first_name, last_name, self_rating),
            away_player_2:members!match_lines_away_player_2_id_fkey(id, first_name, last_name, self_rating),
            line_games (
              id,
              game_number,
              home_score,
              away_score,
              game_status
            )
          )
        `)
        .eq("division_id", team.division_id)
        .eq("is_published", true)
        .order("scheduled_date", { ascending: true })
        .order("scheduled_time", { ascending: true }),
      supabase
        .from("team_byes")
        .select(`
          *,
          teams (
            id,
            name
          ),
          divisions (
            id,
            name
          )
        `)
        .eq("division_id", team.division_id)
        .order("bye_date", { ascending: true }),
      supabase
        .from("team_standings")
        .select("team_id, rank, standings_points, match_wins, match_losses, match_ties")
        .eq("division_id", team.division_id),
      seasonId
        ? supabase
            .from("member_season_ratings")
            .select("member_id, season_dupr_rating, season_primetime_rating")
            .eq("season_id", seasonId)
        : Promise.resolve({ data: [], error: null }),
    ]);

    setDivisionScheduleLoading(false);

    if (teamsError) {
      alert(teamsError.message);
      return;
    }
    if (matchesError) {
      alert(matchesError.message);
      return;
    }
    if (byesError) {
      alert(byesError.message);
      return;
    }
    if (standingsError) {
      alert(standingsError.message);
      return;
    }
    if (ratingsError) {
      alert(ratingsError.message);
      return;
    }

    const standingsByTeamId = Object.fromEntries(
      (divisionStandings || []).map((standing) => [String(standing.team_id), standing])
    );

    setDivisionScheduleTeams(
      (divisionTeams || []).map((divisionTeam) => ({
        ...divisionTeam,
        standing: standingsByTeamId[String(divisionTeam.id)] || null,
      })).sort(compareDivisionScheduleTeams)
    );
    setDivisionScheduleMatches(divisionMatches || []);
    setDivisionScheduleByes(filterByesForPublishedSchedule(divisionByes || [], divisionMatches || []));
    setDivisionScheduleRatings(divisionRatings || []);
  }

if (loading) {
  return <LoadingScreen subtitle="Loading Standings Engine..." />;
}
  const dashboardPath = defaultDashboardForRole(currentUserRole);
  const dashboardLabel =
    dashboardPath === "/captain-dashboard"
      ? "Back to Captain Dashboard"
      : dashboardPath === "/"
        ? "Back to Admin Dashboard"
        : "Back to Player Dashboard";

  return (
    <main className="min-h-screen bg-slate-100 px-3 py-4 sm:p-6">
      <div className="mx-auto w-full max-w-7xl">

        <AppHeader
          title="League Standings"
          subtitle="Advanced rankings, streaks, tiebreakers, and league standings."
        />

        <div className="mb-4 flex">
          <button
            type="button"
            onClick={() => router.push(dashboardPath)}
            className="w-full rounded-xl bg-slate-900 px-5 py-3 text-sm font-black text-white shadow hover:bg-slate-800 sm:w-auto"
          >
            {dashboardLabel}
          </button>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow sm:p-6">

          <div className="grid grid-cols-1 gap-3 md:grid-cols-4 md:gap-4">

            <select
              value={selectedLeague}
              onChange={e => {
                setSelectedLeague(e.target.value);
                setSelectedDivision("");
              }}
              className="w-full rounded-xl border border-slate-300 px-4 py-3"
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
              className="w-full rounded-xl border border-slate-300 px-4 py-3"
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

            {canRebuildLeagueStatistics && (
              <button
                type="button"
                onClick={rebuildLeagueStatistics}
                disabled={!selectedDivision || rebuilding}
                className="w-full rounded-xl bg-slate-900 px-4 py-3 font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 md:col-span-2"
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
          {playoffTeamCount > 0 && (
            <div className="border-b border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-bold text-emerald-950">
              Top {playoffTeamCount} teams highlighted for Playoffs/Championship Day. Click on Team Name to see detailed schedule/matches.
            </div>
          )}

          <div className="space-y-3 p-3 md:hidden">
            {filteredStandings.map((team, index) => {
              const displayRank = index + 1;

              return (
                <div
                  key={team.id}
                  className={`rounded-2xl border p-4 shadow-sm ${
                    isPlayoffTeam(team)
                      ? "border-emerald-200 bg-emerald-50"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs font-black uppercase tracking-wide text-slate-500">
                        Rank #{displayRank}
                      </div>
                      <button
                        type="button"
                        onClick={() => openDivisionSchedule(team)}
                        className="mt-1 text-left text-lg font-black text-blue-800 underline-offset-2 hover:underline"
                      >
                        {team.teams?.name}
                      </button>
                    </div>
                    <div className="rounded-xl bg-blue-700 px-3 py-2 text-center text-white">
                      <div className="text-[10px] font-black uppercase tracking-wide text-blue-100">
                        Pts
                      </div>
                      <div className="text-xl font-black">
                        {team.standings_points}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <StandingStat label="W-L-T" value={`${team.match_wins}-${team.match_losses}-${team.match_ties}`} />
                    <StandingStat label="Teams" value={`${team.line_wins}-${team.line_losses}`} />
                    <StandingStat label="Games" value={`${team.game_wins}-${team.game_losses}`} />
                    <StandingStat label="Home" value={`${team.home_wins}-${team.home_losses}`} />
                    <StandingStat label="Away" value={`${team.away_wins}-${team.away_losses}`} />
                    <StandingStat label="Diff" value={team.point_differential} />
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <StandingStat label="PF" value={team.points_for} />
                    <StandingStat label="PA" value={team.points_against} />
                    <StandingStat label="Form" value={team.recent_form || "-"} mono />
                    <StandingStat label="Streak" value={team.current_streak || "-"} />
                  </div>
                </div>
              );
            })}
          </div>

          <table className="hidden w-full border-collapse md:table">

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

              {filteredStandings.map((team, index) => {
                const displayRank = index + 1;

                return (
                <tr
                  key={team.id}
                  className={`border-b border-slate-100 ${
                    isPlayoffTeam(team)
                      ? "bg-emerald-50 ring-1 ring-inset ring-emerald-200 hover:bg-emerald-100"
                      : "hover:bg-slate-50"
                  }`}
                >

                  <td className="p-3 font-bold">
                    <span className={isPlayoffTeam(team) ? "rounded-full bg-emerald-700 px-2 py-1 text-white" : ""}>
                      #{displayRank}
                    </span>
                  </td>

                  <td className="p-3 font-semibold">
                    <button
                      type="button"
                      onClick={() => openDivisionSchedule(team)}
                      className="font-bold text-blue-800 underline-offset-2 hover:underline"
                    >
                      {team.teams?.name}
                    </button>
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
                );
              })}

            </tbody>

          </table>

        </div>
        )}

        {divisionScheduleTeam && (
          <TeamScheduleModal
            title="Division Team Schedules/Standings"
            subtitle={`${selectedDivisionRow?.leagues?.name || "League"} · ${selectedDivisionRow?.name || "Division"}`}
            teams={divisionScheduleTeams}
            selectedTeamId={divisionScheduleTeam.id}
            onSelectTeam={(team) => {
              setDivisionScheduleTeam({
                ...team,
                divisions: selectedDivisionRow,
              });
            }}
            matches={divisionScheduleMatches}
            byes={divisionScheduleByes}
            ratings={divisionScheduleRatings}
            ratingType={selectedDivisionRow?.rating_type || "dupr"}
            loading={divisionScheduleLoading}
            compact
            onClose={() => {
              setDivisionScheduleTeam(null);
              setDivisionScheduleTeams([]);
              setDivisionScheduleMatches([]);
              setDivisionScheduleByes([]);
              setDivisionScheduleRatings([]);
            }}
          />
        )}

      </div>
    </main>
  );
}

function StandingStat({ label, value, mono = false }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2">
      <div className="text-[10px] font-black uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className={`mt-1 font-black text-slate-900 ${mono ? "font-mono" : ""}`}>
        {value}
      </div>
    </div>
  );
}

function scheduleWeekKey(divisionId, weekNumber, date) {
  return `${divisionId || ""}:${weekNumber || ""}:${date || ""}`;
}

function filterByesForPublishedSchedule(byes, matches) {
  const publishedScheduleKeys = new Set(
    matches.map((match) =>
      scheduleWeekKey(match.division_id, match.week_number, match.scheduled_date)
    )
  );

  return byes.filter((bye) =>
    publishedScheduleKeys.has(scheduleWeekKey(bye.division_id, bye.week_number, bye.bye_date))
  );
}

function compareDivisionScheduleTeams(a, b) {
  const aStanding = a.standing || {};
  const bStanding = b.standing || {};
  const aRank = Number(aStanding.rank || 0);
  const bRank = Number(bStanding.rank || 0);

  if (aRank && bRank && aRank !== bRank) return aRank - bRank;
  if (aRank && !bRank) return -1;
  if (!aRank && bRank) return 1;

  const pointsDifference =
    Number(bStanding.standings_points || 0) - Number(aStanding.standings_points || 0);

  if (pointsDifference !== 0) return pointsDifference;

  return String(a.name || "").localeCompare(String(b.name || ""));
}
