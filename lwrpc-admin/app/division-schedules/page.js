"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppHeader from "../components/AppHeader";
import LoadingScreen from "../components/LoadingScreen";
import TeamScheduleModal from "../components/TeamScheduleModal";
import { requireRole, supabase } from "../lib/auth";

export default function DivisionSchedulesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [divisionOptions, setDivisionOptions] = useState([]);
  const [selectedDivisionId, setSelectedDivisionId] = useState("");
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [teams, setTeams] = useState([]);
  const [matches, setMatches] = useState([]);
  const [byes, setByes] = useState([]);
  const [ratings, setRatings] = useState([]);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [error, setError] = useState("");

  const loadDivisionSchedule = useCallback(async function loadDivisionSchedule(divisionId, options, preferredTeamId = "") {
    const option = options.find((item) => String(item.id) === String(divisionId));
    if (!option) return;

    setSelectedDivisionId(divisionId);
    setScheduleLoading(true);
    setError("");
    setTeams([]);
    setMatches([]);
    setByes([]);
    setRatings([]);

    const seasonId = option.division.leagues?.season_id;
    const [
      { data: divisionTeams, error: teamsError },
      { data: divisionMatches, error: matchesError },
      { data: divisionByes, error: byesError },
      { data: divisionStandings, error: standingsError },
      { data: divisionRatings, error: ratingsError },
    ] = await Promise.all([
      supabase.from("teams").select("id, name, division_id, locations(id, name)").eq("division_id", divisionId).eq("is_active", true).order("name"),
      supabase.from("matches").select("id, division_id, home_team_id, away_team_id, scheduled_date, scheduled_time, week_number, status, score_status, home_score, away_score, winning_team_id, result_type, result_notes, is_published, locations(id, name), home_team:teams!matches_home_team_id_fkey(id, name), away_team:teams!matches_away_team_id_fkey(id, name), match_lines(id, line_number, home_team_games_won, away_team_games_won, winning_team_id, home_player_1:members!match_lines_home_player_1_id_fkey(id, first_name, last_name, full_name, self_rating), home_player_2:members!match_lines_home_player_2_id_fkey(id, first_name, last_name, full_name, self_rating), away_player_1:members!match_lines_away_player_1_id_fkey(id, first_name, last_name, full_name, self_rating), away_player_2:members!match_lines_away_player_2_id_fkey(id, first_name, last_name, full_name, self_rating), line_games(id, game_number, home_score, away_score, game_status))").eq("division_id", divisionId).eq("is_published", true).order("scheduled_date").order("scheduled_time"),
      supabase.from("team_byes").select("id, team_id, division_id, week_number, bye_date, teams(id, name), divisions(id, name)").eq("division_id", divisionId).order("bye_date"),
      supabase.from("team_standings").select("team_id, rank, standings_points, match_wins, match_losses").eq("division_id", divisionId),
      seasonId ? supabase.from("member_season_ratings").select("member_id, season_dupr_rating, season_primetime_rating").eq("season_id", seasonId) : Promise.resolve({ data: [], error: null }),
    ]);

    setScheduleLoading(false);
    const loadError = teamsError || matchesError || byesError || standingsError || ratingsError;
    if (loadError) {
      setError(loadError.message || "Unable to load division schedules.");
      setSelectedTeam({ division_id: divisionId, divisions: option.division });
      return;
    }

    const standingsByTeamId = Object.fromEntries((divisionStandings || []).map((row) => [String(row.team_id), row]));
    const populatedTeams = (divisionTeams || [])
      .map((team) => ({ ...team, standing: standingsByTeamId[String(team.id)] || null }))
      .sort((a, b) => Number(a.standing?.rank || 999) - Number(b.standing?.rank || 999) || a.name.localeCompare(b.name));
    const preferredTeam = populatedTeams.find((team) => String(team.id) === String(preferredTeamId));

    setTeams(populatedTeams);
    setSelectedTeam({ ...(preferredTeam || populatedTeams[0] || {}), division_id: divisionId, divisions: option.division });
    setMatches(divisionMatches || []);
    setByes(divisionByes || []);
    setRatings(divisionRatings || []);
  }, []);

  useEffect(() => {
    async function loadPage() {
      const user = await requireRole(router, "league_manager");
      if (!user) return;

      const { data, error: divisionsError } = await supabase
        .from("divisions")
        .select("id, name, rating_type, is_active, leagues(id, name, season_id, is_active, seasons(id, is_active))")
        .order("name", { ascending: true });

      if (divisionsError) {
        setError(divisionsError.message || "Unable to load current divisions.");
        setLoading(false);
        return;
      }

      const options = (data || [])
        .filter((division) => division.is_active !== false && division.leagues?.is_active !== false && division.leagues?.seasons?.is_active !== false)
        .map((division) => ({
          id: division.id,
          divisionName: division.name || "Division",
          leagueName: division.leagues?.name || "League",
          label: `${division.leagues?.name || "League"} / ${division.name || "Division"}`,
          division,
        }));

      setDivisionOptions(options);
      const params = new URLSearchParams(window.location.search);
      const requestedDivisionId = params.get("division");
      const requestedTeamId = params.get("team") || "";
      const initialDivisionId = options.some((option) => String(option.id) === String(requestedDivisionId))
        ? requestedDivisionId
        : options[0]?.id || "";
      setLoading(false);
      await loadDivisionSchedule(initialDivisionId, options, requestedTeamId);
    }

    loadPage();
  }, [loadDivisionSchedule, router]);

  if (loading) return <LoadingScreen subtitle="Loading Division Schedules..." />;

  const selectedDivision = divisionOptions.find((option) => String(option.id) === String(selectedDivisionId));

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-6">
      <div className="mx-auto max-w-7xl">
        <AppHeader
          title="Division Schedules"
          subtitle="Review published team schedules for every active league division or pool."
        />

        <div className="mb-4 flex">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="w-full rounded-xl bg-slate-900 px-5 py-3 text-sm font-black text-white shadow hover:bg-slate-800 sm:w-auto"
          >
            Back to Admin Dashboard
          </button>
        </div>

        {error && <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 font-semibold text-red-800">{error}</div>}

        {divisionOptions.length ? (
          <TeamScheduleModal
            page
            title="Division Team Schedules"
            subtitle={selectedDivision?.label || "Choose a current division"}
            divisionOptions={divisionOptions}
            selectedDivisionId={selectedDivisionId}
            onSelectDivision={(divisionId) => loadDivisionSchedule(divisionId, divisionOptions)}
            teams={teams}
            selectedTeamId={selectedTeam?.id || ""}
            onSelectTeam={(team) => setSelectedTeam({ ...team, division_id: selectedDivisionId, divisions: selectedDivision?.division })}
            matches={matches}
            byes={byes}
            ratings={ratings}
            ratingType={selectedDivision?.division?.rating_type || "dupr"}
            loading={scheduleLoading}
            compact
          />
        ) : (
          <div className="rounded-2xl bg-white p-8 text-center font-semibold text-slate-500 shadow">There are no current divisions available.</div>
        )}
      </div>
    </main>
  );
}
