"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppHeader from "../components/AppHeader";
import { requireRole, supabase } from "../lib/auth";
import { formatDisplayDate, formatDisplayTime } from "../lib/dateTime";
import { confirmDeleteAction } from "../lib/confirmDelete";

export default function MatchesPage() {
  const router = useRouter();

  const [leagues, setLeagues] = useState([]);
  const [divisions, setDivisions] = useState([]);
  const [teams, setTeams] = useState([]);
  const [locations, setLocations] = useState([]);
  const [matches, setMatches] = useState([]);

  const [selectedLeague, setSelectedLeague] = useState("");
  const [selectedDivision, setSelectedDivision] = useState("");
  const [homeTeamId, setHomeTeamId] = useState("");
  const [awayTeamId, setAwayTeamId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [weekNumber, setWeekNumber] = useState("1");
  const [notes, setNotes] = useState("");

  const checkAuth = useCallback(async function checkAuth() {
    const user = await requireRole(router, "league_manager");
    return !!user;
  }, [router]);

  const loadData = useCallback(async function loadData() {
    const { data: leagueData } = await supabase
      .from("leagues")
      .select("*")
      .order("name", { ascending: true });

    const { data: divisionData } = await supabase
      .from("divisions")
      .select("*")
      .order("sort_order", { ascending: true });

    const { data: teamData } = await supabase
      .from("teams")
      .select(`
        *,
        divisions (
          id,
          name
        ),
        locations (
          id,
          name
        )
      `)
      .order("name", { ascending: true });

    const { data: locationData } = await supabase
      .from("locations")
      .select("*")
      .order("name", { ascending: true });

    const { data: matchData } = await supabase
      .from("matches")
      .select(`
        *,
        divisions (
          name
        ),
        home_team:teams!matches_home_team_id_fkey (
          name
        ),
        away_team:teams!matches_away_team_id_fkey (
          name
        ),
        locations (
          name
        )
      `)
      .order("scheduled_date", { ascending: true });

    setLeagues(leagueData || []);
    setDivisions(divisionData || []);
    setTeams(teamData || []);
    setLocations(locationData || []);
    setMatches(matchData || []);
  }, []);

  async function createMatch(e) {
    e.preventDefault();

    if (!selectedLeague || !selectedDivision || !homeTeamId || !awayTeamId) {
      alert("League, division, and teams are required");
      return;
    }

    if (homeTeamId === awayTeamId) {
      alert("Home and away teams cannot be the same");
      return;
    }

    const payload = {
      league_id: selectedLeague,
      division_id: selectedDivision,
      home_team_id: homeTeamId,
      away_team_id: awayTeamId,
      location_id: locationId || null,
      scheduled_date: scheduledDate || null,
      scheduled_time: scheduledTime || null,
      week_number: Number(weekNumber || 1),
      notes: notes || null,
      status: "scheduled",
      updated_at: new Date().toISOString()
    };

    const { data: createdMatch, error } = await supabase
      .from("matches")
      .insert(payload)
      .select()
      .single();

    if (error) {
      alert(error.message);
      return;
    }

    await generateMatchLines(createdMatch.id, selectedDivision);

    clearForm();
    loadData();
  }

  async function generateMatchLines(matchId, divisionId) {
    const { data: lineTemplates, error } = await supabase
      .from("division_lines")
      .select("*")
      .eq("division_id", divisionId)
      .order("line_number", { ascending: true });

    if (error) {
      alert(error.message);
      return;
    }

    if (!lineTemplates || lineTemplates.length === 0) {
      return;
    }

    const rows = lineTemplates.map(line => ({
      match_id: matchId,
      division_line_id: line.id,
      line_number: line.line_number,
      posted_to_dupr: line.posted_to_dupr,
      line_status: "scheduled"
    }));

    const { data: createdLines, error: insertError } = await supabase
      .from("match_lines")
      .insert(rows)
      .select("id, division_line_id");

    if (insertError) {
      alert(insertError.message);
      return;
    }

    const gameRows = [];

    (createdLines || []).forEach(matchLine => {
      const template = lineTemplates.find(
        line => line.id === matchLine.division_line_id
      );
      const gamesPerTeam = Number(template?.games_per_line || 1);

      for (let i = 1; i <= gamesPerTeam; i++) {
        gameRows.push({
          match_line_id: matchLine.id,
          game_number: i,
          game_status: "scheduled"
        });
      }
    });

    if (gameRows.length > 0) {
      const { error: gameError } = await supabase
        .from("line_games")
        .insert(gameRows);

      if (gameError) {
        alert(gameError.message);
      }
    }
  }

  async function deleteMatch(match) {
    if (isMatchLocked(match)) {
      alert("This match is completed and verified. Use Reset Scores in Schedule Editor before deleting it.");
      return;
    }

    const ok = confirmDeleteAction({
      title: "Delete this match?",
      details: "This will delete the match plus generated match lines and individual game score rows. Any entered scores, DUPR export readiness, and standings impact for this match will be lost.",
    });

    if (!ok) return;

    const { data: linesToDelete, error: findLineError } = await supabase
      .from("match_lines")
      .select("id")
      .eq("match_id", match.id);

    if (findLineError) {
      alert(findLineError.message);
      return;
    }

    const lineIds = (linesToDelete || []).map(line => line.id);

    if (lineIds.length > 0) {
      const { error: gameError } = await supabase
        .from("line_games")
        .delete()
        .in("match_line_id", lineIds);

      if (gameError) {
        alert(gameError.message);
        return;
      }

      const { error: lineError } = await supabase
        .from("match_lines")
        .delete()
        .eq("match_id", match.id);

      if (lineError) {
        alert(lineError.message);
        return;
      }
    }

    const { error } = await supabase
      .from("matches")
      .delete()
      .eq("id", match.id);

    if (error) {
      alert(error.message);
      return;
    }

    loadData();
  }

  function clearForm() {
    setSelectedLeague("");
    setSelectedDivision("");
    setHomeTeamId("");
    setAwayTeamId("");
    setLocationId("");
    setScheduledDate("");
    setScheduledTime("");
    setWeekNumber("1");
    setNotes("");
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
      division => division.league_id === selectedLeague
    );
  }, [divisions, selectedLeague]);

  const filteredTeams = useMemo(() => {
    if (!selectedDivision) return [];

    return teams.filter(
      team => team.division_id === selectedDivision
    );
  }, [teams, selectedDivision]);

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-7xl">
        <AppHeader
          title="Match Scheduler"
          subtitle="Create league matches, makeup matches, rain dates, and manage match scheduling."
        />

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6">
            <div className="rounded-2xl bg-white p-6 shadow">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-900">
                  Create Match
                </h2>

                <div className="rounded-xl bg-slate-900 px-5 py-3 text-white">
                  <div className="text-xs uppercase tracking-wide text-slate-300">
                    Matches
                  </div>

                  <div className="text-2xl font-bold">
                    {matches.length}
                  </div>
                </div>
              </div>

              <form onSubmit={createMatch} className="space-y-4">
                <FieldLabel label="League" />

                <select
                  value={selectedLeague}
                  onChange={e => {
                    setSelectedLeague(e.target.value);
                    setSelectedDivision("");
                    setHomeTeamId("");
                    setAwayTeamId("");
                  }}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3"
                >
                  <option value="">Select League</option>

                  {leagues.map(league => (
                    <option key={league.id} value={league.id}>
                      {league.name}
                    </option>
                  ))}
                </select>

                <FieldLabel label="Division" />

                <select
                  value={selectedDivision}
                  onChange={e => {
                    setSelectedDivision(e.target.value);
                    setHomeTeamId("");
                    setAwayTeamId("");
                  }}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3"
                >
                  <option value="">Select Division</option>

                  {filteredDivisions.map(division => (
                    <option key={division.id} value={division.id}>
                      {division.name}
                    </option>
                  ))}
                </select>

                <FieldLabel label="Home Team" />

                <select
                  value={homeTeamId}
                  onChange={e => setHomeTeamId(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3"
                >
                  <option value="">Select Home Team</option>

                  {filteredTeams.map(team => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>

                <FieldLabel label="Away Team" />

                <select
                  value={awayTeamId}
                  onChange={e => setAwayTeamId(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3"
                >
                  <option value="">Select Away Team</option>

                  {filteredTeams.map(team => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>

                <FieldLabel label="Match Location" />

                <select
                  value={locationId}
                  onChange={e => setLocationId(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3"
                >
                  <option value="">Select Location</option>

                  {locations.map(location => (
                    <option key={location.id} value={location.id}>
                      {location.name}
                    </option>
                  ))}
                </select>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <FieldLabel label="Match Date" />

                    <input
                      type="date"
                      value={scheduledDate}
                      onChange={e => setScheduledDate(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-4 py-3"
                    />
                  </div>

                  <div>
                    <FieldLabel label="Match Time" />

                    <input
                      type="time"
                      value={scheduledTime}
                      onChange={e => setScheduledTime(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-4 py-3"
                    />
                  </div>
                </div>

                <div>
                  <FieldLabel label="Week Number" />

                  <input
                    type="number"
                    value={weekNumber}
                    onChange={e => setWeekNumber(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3"
                  />
                </div>

                <div>
                  <FieldLabel label="Match Notes" />

                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3"
                    placeholder="Rain date, makeup match, holiday week, special court assignment, etc."
                  />
                </div>

                <button
                  type="submit"
                  className="w-full rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800"
                >
                  Create Match
                </button>
              </form>
            </div>

          </div>

          <div className="rounded-2xl bg-white p-6 shadow lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">
                Scheduled Matches
              </h2>

              <div className="text-sm text-slate-500">
                {matches.length} total scheduled matches
              </div>
            </div>

            <div className="space-y-3">
              {matches.map(match => (
                <div
                  key={match.id}
                  className="rounded-xl border border-slate-200 p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-lg font-bold text-slate-900">
                        {match.home_team?.name || "Home"}
                        {" vs "}
                        {match.away_team?.name || "Away"}
                      </div>

                      <div className="mt-1 text-sm text-slate-600">
                        Division: {match.divisions?.name || "—"}
                      </div>

                      <div className="mt-1 text-sm text-slate-600">
                        Location: {match.locations?.name || "—"}
                      </div>

                      <div className="mt-1 text-sm text-slate-600">
                        Date: {formatDisplayDate(match.scheduled_date, "No Date")}
                      </div>

                      <div className="mt-1 text-sm text-slate-600">
                        Time: {formatDisplayTime(match.scheduled_time, "No Time")}
                      </div>

                      <div className="mt-1 text-sm text-slate-600">
                        Week: {match.week_number || "—"}
                      </div>

                      <div className="mt-1 text-sm text-slate-600">
                        Status: {match.status || "scheduled"}
                      </div>

                      {match.notes && (
                        <div className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
                          Note: {match.notes}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          router.push(`/matches/${match.id}`)
                        }
                        className="rounded-lg bg-slate-900 px-3 py-1 text-sm font-semibold text-white hover:bg-slate-800"
                      >
                        Open Match
                      </button>

                      <button
                        onClick={() => deleteMatch(match)}
                        disabled={isMatchLocked(match)}
                        className="rounded-lg bg-red-100 px-3 py-1 text-sm font-semibold text-red-800 hover:bg-red-200 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {matches.length === 0 && (
                <div className="text-slate-500">
                  No matches scheduled yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function FieldLabel({ label }) {
  return (
    <label className="mb-1 block text-sm font-semibold text-slate-700">
      {label}
    </label>
  );
}

function isMatchLocked(match) {
  return match?.status === "completed" && match?.score_status === "verified";
}
