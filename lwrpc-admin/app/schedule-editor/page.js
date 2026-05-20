"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppHeader from "../components/AppHeader";
import { requireRole, supabase } from "../lib/auth";

export default function ScheduleEditorPage() {
  const router = useRouter();

  const [matches, setMatches] = useState([]);
  const [leagues, setLeagues] = useState([]);
  const [divisions, setDivisions] = useState([]);
  const [locations, setLocations] = useState([]);
  const [scheduleSettings, setScheduleSettings] = useState([]);
  const [teams, setTeams] = useState([]);
  const [availability, setAvailability] = useState([]);
  const [leagueBlackouts, setLeagueBlackouts] = useState([]);

  const [leagueFilter, setLeagueFilter] = useState("");
  const [divisionFilters, setDivisionFilters] = useState([]);
  const [locationFilter, setLocationFilter] = useState("");
  const [weekFilter, setWeekFilter] = useState("");
  const [publishedFilter, setPublishedFilter] = useState("all");
  const [sortBy, setSortBy] = useState("date");
  const [showMatchNotes, setShowMatchNotes] = useState(false);
  const [selectedMatchIds, setSelectedMatchIds] = useState([]);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);

  const checkAuth = useCallback(async function checkAuth() {
    const user = await requireRole(router, "league_manager");
    return !!user;
  }, [router]);

  const loadData = useCallback(async function loadData() {
    const { data: matchData, error: matchError } = await supabase
      .from("matches")
      .select(`
        *,
        leagues (
          id,
          name
        ),
        divisions (
          id,
          name
        ),
        locations (
          id,
          name,
          number_of_courts
        ),
        home_team:teams!matches_home_team_id_fkey (
          id,
          name,
          home_location_id
        ),
        away_team:teams!matches_away_team_id_fkey (
          id,
          name,
          home_location_id
        )
      `)
      .order("scheduled_date", { ascending: true })
      .order("scheduled_time", { ascending: true });

    if (matchError) {
      alert(matchError.message);
      return;
    }

    const { data: leagueData } = await supabase
      .from("leagues")
      .select("id, name")
      .order("name", { ascending: true });

    const { data: divisionData } = await supabase
      .from("divisions")
      .select("id, name, league_id")
      .order("name", { ascending: true });

    const { data: locationData } = await supabase
      .from("locations")
      .select("id, name, number_of_courts")
      .order("name", { ascending: true });

    const { data: settingsData } = await supabase
      .from("league_schedule_settings")
      .select("league_id, division_id, courts_needed_per_match");

    const { data: teamData } = await supabase
      .from("teams")
      .select("id, name, division_id, home_location_id");

    const { data: availabilityData } = await supabase
      .from("location_court_availability")
      .select("*");

    const { data: blackoutData } = await supabase
      .from("league_blackout_dates")
      .select("*");

    setMatches(matchData || []);
    setLeagues(leagueData || []);
    setDivisions(divisionData || []);
    setLocations(locationData || []);
    setScheduleSettings(settingsData || []);
    setTeams(teamData || []);
    setAvailability(availabilityData || []);
    setLeagueBlackouts(blackoutData || []);
  }, []);

  function courtsNeededForMatch(match) {
    const setting = scheduleSettings.find(
      (row) =>
        row.league_id === match.league_id &&
        row.division_id === match.division_id
    );

    return Number(setting?.courts_needed_per_match || 1);
  }

  function courtUsageForMatch(match) {
    if (!match.location_id || !match.scheduled_date) {
      return { used: 0, total: Number(match.locations?.number_of_courts || 0) };
    }

    const used = matches
      .filter(
        (row) =>
          row.id !== match.id &&
          row.location_id === match.location_id &&
          row.scheduled_date === match.scheduled_date &&
          (row.scheduled_time || "") === (match.scheduled_time || "")
      )
      .reduce((sum, row) => sum + courtsNeededForMatch(row), courtsNeededForMatch(match));

    return {
      used,
      total: Number(match.locations?.number_of_courts || 0),
    };
  }

  function locationName(locationId) {
    return locations.find((location) => String(location.id) === String(locationId))?.name || "No Location";
  }

  function courtUsageTextForMatch(match) {
    const usage = courtUsageForMatch(match);
    return `${usage.used}/${usage.total || "?"} courts used`;
  }

  function isAvailabilityMatch(row, locationId, matchDate, matchTime) {
    if (String(row.location_id) !== String(locationId)) return false;
    if (row.specific_date && row.specific_date !== matchDate) return false;

    if (!row.specific_date && row.day_of_week !== null && row.day_of_week !== undefined && row.day_of_week !== "") {
      const date = new Date(`${matchDate}T12:00:00`);
      if (String(row.day_of_week) !== String(date.getDay())) return false;
    }

    if (row.start_time && matchTime && matchTime < row.start_time) return false;
    if (row.end_time && matchTime && matchTime > row.end_time) return false;
    return true;
  }

  function isLeagueBlackoutDate(match) {
    return leagueBlackouts.some((blackout) => {
      const sameLeague = blackout.league_id === match.league_id;
      const sameDivision = !blackout.division_id || blackout.division_id === match.division_id;
      return sameLeague && sameDivision && blackout.blackout_date === match.scheduled_date;
    });
  }

  function wouldHaveEnoughCourts(proposedMatches, matchToCheck) {
    const location = locations.find((loc) => String(loc.id) === String(matchToCheck.location_id));
    const totalCourts = Number(location?.number_of_courts || 0);

    if (!totalCourts) return false;

    const unavailable = availability
      .filter((row) =>
        isAvailabilityMatch(
          row,
          matchToCheck.location_id,
          matchToCheck.scheduled_date,
          matchToCheck.scheduled_time
        )
      )
      .reduce((sum, row) => sum + Number(row.courts_unavailable ?? row.courts_available ?? 0), 0);

    const used = proposedMatches
      .filter((match) => {
        return (
          String(match.location_id) === String(matchToCheck.location_id) &&
          match.scheduled_date === matchToCheck.scheduled_date &&
          (match.scheduled_time || "") === (matchToCheck.scheduled_time || "")
        );
      })
      .reduce((sum, match) => sum + courtsNeededForMatch(match), 0);

    return totalCourts - unavailable - used >= 0;
  }

  function homeAwayScore(counts) {
    return Object.values(counts).reduce(
      (sum, count) => sum + Math.abs(Number(count.home || 0) - Number(count.away || 0)),
      0
    );
  }

  function getSelectedMatches() {
    const selected = new Set(selectedMatchIds);
    return matches.filter((match) => selected.has(match.id));
  }

  function toggleMatchSelection(matchId) {
    setSelectedMatchIds((current) =>
      current.includes(matchId)
        ? current.filter((id) => id !== matchId)
        : [...current, matchId]
    );
  }

  function selectVisibleMatches() {
    setSelectedMatchIds(filteredMatches.map((match) => match.id));
  }

  async function publishSelectedMatches(shouldPublish) {
    const selected = getSelectedMatches();

    if (selected.length === 0) {
      alert("Select one or more matches first.");
      return;
    }

    const action = shouldPublish ? "publish" : "unpublish";
    if (!confirm(`${action === "publish" ? "Publish" : "Unpublish"} ${selected.length} selected match(es)?`)) return;

    setIsBulkUpdating(true);

    const { error } = await supabase
      .from("matches")
      .update({
        is_published: shouldPublish,
        status: shouldPublish ? "scheduled" : "draft",
        published_at: shouldPublish ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .in("id", selected.map((match) => match.id));

    setIsBulkUpdating(false);

    if (error) {
      alert(error.message);
      return;
    }

    setSelectedMatchIds([]);
    loadData();
  }

  async function balanceSelectedMatches() {
    const selected = getSelectedMatches()
      .filter((match) => match.home_team_id && match.away_team_id)
      .sort((a, b) => {
        const aDate = `${a.scheduled_date || "9999-12-31"}T${a.scheduled_time || "00:00"}`;
        const bDate = `${b.scheduled_date || "9999-12-31"}T${b.scheduled_time || "00:00"}`;
        return aDate.localeCompare(bDate);
      });

    if (selected.length === 0) {
      alert("Select one or more team-vs-team matches first.");
      return;
    }

    if (!confirm(`Balance home/away across ${selected.length} selected match(es)?`)) return;

    setIsBulkUpdating(true);

    try {
      const teamMap = new Map(teams.map((team) => [team.id, team]));
      const counts = {};
      const proposedById = new Map();
      const warnings = [];

      selected.forEach((match) => {
        if (!counts[match.home_team_id]) counts[match.home_team_id] = { home: 0, away: 0 };
        if (!counts[match.away_team_id]) counts[match.away_team_id] = { home: 0, away: 0 };
      });

      function ensureCount(teamId, targetCounts = counts) {
        if (!targetCounts[teamId]) targetCounts[teamId] = { home: 0, away: 0 };
        return targetCounts[teamId];
      }

      function proposedListWith(candidate) {
        const nextById = new Map(proposedById);
        nextById.set(candidate.id, candidate);
        return matches.map((match) => nextById.get(match.id) || match);
      }

      selected.forEach((match) => {
        if (isLeagueBlackoutDate(match)) {
          warnings.push(`Skipped ${match.home_team?.name || "Home"} vs ${match.away_team?.name || "Away"} on ${match.scheduled_date}: blackout date.`);
          ensureCount(match.home_team_id).home += 1;
          ensureCount(match.away_team_id).away += 1;
          proposedById.set(match.id, match);
          return;
        }

        const currentCandidate = {
          ...match,
          location_id: match.location_id || teamMap.get(match.home_team_id)?.home_location_id,
        };
        const swappedHome = teamMap.get(match.away_team_id);
        const swappedCandidate = {
          ...match,
          home_team_id: match.away_team_id,
          away_team_id: match.home_team_id,
          location_id: swappedHome?.home_location_id,
        };

        const currentCounts = structuredClone(counts);
        ensureCount(match.home_team_id, currentCounts).home += 1;
        ensureCount(match.away_team_id, currentCounts).away += 1;

        const swappedCounts = structuredClone(counts);
        ensureCount(match.away_team_id, swappedCounts).home += 1;
        ensureCount(match.home_team_id, swappedCounts).away += 1;

        const currentValid = wouldHaveEnoughCourts(proposedListWith(currentCandidate), currentCandidate);
        const swappedValid =
          Boolean(swappedCandidate.location_id) &&
          wouldHaveEnoughCourts(proposedListWith(swappedCandidate), swappedCandidate);

        const useSwapped =
          swappedValid &&
          homeAwayScore(swappedCounts) < homeAwayScore(currentCounts);

        if (useSwapped || (!currentValid && swappedValid)) {
          ensureCount(match.away_team_id).home += 1;
          ensureCount(match.home_team_id).away += 1;
          proposedById.set(match.id, swappedCandidate);
          return;
        }

        if (!currentValid) {
          warnings.push(`${match.home_team?.name || "Home"} vs ${match.away_team?.name || "Away"} on ${match.scheduled_date}: not enough courts at either home location.`);
        }

        ensureCount(match.home_team_id).home += 1;
        ensureCount(match.away_team_id).away += 1;
        proposedById.set(match.id, currentCandidate);
      });

      const updates = [...proposedById.values()].filter((match) => {
        const original = selected.find((row) => row.id === match.id);
        return (
          original &&
          (original.home_team_id !== match.home_team_id ||
            original.away_team_id !== match.away_team_id ||
            original.location_id !== match.location_id)
        );
      });

      for (const match of updates) {
        const { error } = await supabase
          .from("matches")
          .update({
            home_team_id: match.home_team_id,
            away_team_id: match.away_team_id,
            location_id: match.location_id,
            updated_at: new Date().toISOString(),
          })
          .eq("id", match.id);

        if (error) {
          alert(error.message);
          return;
        }
      }

      setSelectedMatchIds([]);
      await loadData();

      let message = `Balanced selected matches. Updated ${updates.length} match(es).`;
      if (warnings.length > 0) {
        message += `\n\nWarnings:\n\n${warnings.slice(0, 12).join("\n\n")}`;
      }
      alert(message);
    } finally {
      setIsBulkUpdating(false);
    }
  }

  async function swapHomeAway(match) {
    const newLocationId = match.away_team?.home_location_id || null;

    if (!newLocationId) {
      alert(`${match.away_team?.name || "Away team"} does not have a home location assigned.`);
      return;
    }

    const proposedMatch = {
      ...match,
      home_team_id: match.away_team_id,
      away_team_id: match.home_team_id,
      location_id: newLocationId,
      locations: locations.find((location) => String(location.id) === String(newLocationId)) || null,
    };

    if (!wouldHaveEnoughCourts(matches.map((row) => (row.id === match.id ? proposedMatch : row)), proposedMatch)) {
      const ok = confirm(
        [
          `Swap ${match.home_team?.name || "Home"} and ${match.away_team?.name || "Away"} anyway?`,
          "",
          `${locationName(newLocationId)} may not have enough available courts at this date/time.`,
          `Current: ${courtUsageTextForMatch(match)}`,
        ].join("\n")
      );

      if (!ok) return;
    }

    const ok = confirm(
      [
        `Swap home and away teams for ${match.home_team?.name || "Home"} vs ${match.away_team?.name || "Away"}?`,
        "",
        `Home team will become: ${match.away_team?.name || "Away"}`,
        `Location will become: ${locationName(newLocationId)}`,
      ].join("\n")
    );

    if (!ok) return;

    const { error } = await supabase
      .from("matches")
      .update({
        home_team_id: match.away_team_id,
        away_team_id: match.home_team_id,
        location_id: newLocationId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", match.id);

    if (error) {
      alert(error.message);
      return;
    }

    loadData();
  }

  async function updateMatch(matchId, field, value) {
    const payload = {
      [field]: value === "" ? null : value,
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from("matches")
      .update(payload)
      .eq("id", matchId);

    if (error) {
      alert(error.message);
      return;
    }

    loadData();
  }

  async function deleteMatch(matchId) {
    const ok = confirm("Delete this match and its generated teams/games?");

    if (!ok) return;

    const { data: linesToDelete, error: findLineError } = await supabase
      .from("match_lines")
      .select("id")
      .eq("match_id", matchId);

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
        .eq("match_id", matchId);

      if (lineError) {
        alert(lineError.message);
        return;
      }
    }

    const { error } = await supabase
      .from("matches")
      .delete()
      .eq("id", matchId);

    if (error) {
      alert(error.message);
      return;
    }

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
    if (!leagueFilter) return divisions;

    return divisions.filter(
      d => d.league_id === leagueFilter
    );
  }, [divisions, leagueFilter]);

  const filteredMatches = (() => {
    const filtered = matches.filter(match => {
      if (
        leagueFilter &&
        match.league_id !== leagueFilter
      ) return false;

      if (
        divisionFilters.length > 0 &&
        !divisionFilters.includes(match.division_id)
      ) return false;

      if (
        locationFilter &&
        match.location_id !== locationFilter
      ) return false;

      if (
        weekFilter &&
        String(match.week_number || "") !== weekFilter
      ) return false;

      if (
        publishedFilter === "published" &&
        !match.is_published
      ) return false;

      if (
        publishedFilter === "draft" &&
        match.is_published
      ) return false;

      return true;
    });

    return [...filtered].sort((a, b) => {
      const dateCompare = `${a.scheduled_date || "9999-12-31"} ${a.scheduled_time || "99:99"}`
        .localeCompare(`${b.scheduled_date || "9999-12-31"} ${b.scheduled_time || "99:99"}`);
      const locationCompare = (a.locations?.name || "").localeCompare(b.locations?.name || "");
      const weekCompare = Number(a.week_number || 9999) - Number(b.week_number || 9999);
      const leagueCompare = (a.leagues?.name || "").localeCompare(b.leagues?.name || "");
      const divisionCompare = (a.divisions?.name || "").localeCompare(b.divisions?.name || "");
      const teamCompare = (a.home_team?.name || "").localeCompare(b.home_team?.name || "");

      if (sortBy === "location") return locationCompare || dateCompare || teamCompare;
      if (sortBy === "week") return weekCompare || dateCompare || locationCompare;
      if (sortBy === "league") return leagueCompare || divisionCompare || dateCompare;
      if (sortBy === "division") return divisionCompare || dateCompare || teamCompare;
      if (sortBy === "team") return teamCompare || dateCompare;
      return dateCompare || locationCompare || teamCompare;
    });
  })();

  const weeks = useMemo(() => {
    const values = matches
      .map(match => match.week_number)
      .filter(value => value !== null && value !== undefined);

    return [...new Set(values)].sort(
      (a, b) => Number(a) - Number(b)
    );
  }, [matches]);

  function clearFilters() {
    setLeagueFilter("");
    setDivisionFilters([]);
    setLocationFilter("");
    setWeekFilter("");
    setPublishedFilter("all");
    setSortBy("date");
    setSelectedMatchIds([]);
  }

  function toggleDivisionFilter(divisionId) {
    setDivisionFilters((current) =>
      current.includes(divisionId)
        ? current.filter((id) => id !== divisionId)
        : [...current, divisionId]
    );
  }

  function selectAllDivisions() {
    setDivisionFilters([]);
  }

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-7xl">

        <AppHeader
          title="Visual Schedule Editor"
          subtitle="Review draft schedules, edit matches, and publish league schedules."
        />

        <div className="rounded-2xl bg-white p-6 shadow">

          <div className="mb-4 flex items-center justify-between">

            <h2 className="text-xl font-bold text-slate-900">
              Schedule Filters
            </h2>

            <div className="rounded-xl bg-slate-900 px-5 py-3 text-white">
              <div className="text-xs uppercase tracking-wide text-slate-300">
                Matches
              </div>

              <div className="text-2xl font-bold">
                {filteredMatches.length}
              </div>
            </div>

          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-7">

            <select
              value={leagueFilter}
              onChange={e => {
                setLeagueFilter(e.target.value);
                setDivisionFilters([]);
              }}
              className="rounded-xl border border-slate-300 px-4 py-3"
            >
              <option value="">All Leagues</option>

              {leagues.map(league => (
                <option
                  key={league.id}
                  value={league.id}
                >
                  {league.name}
                </option>
              ))}
            </select>

            <div className="max-h-32 overflow-y-auto rounded-xl border border-slate-300 bg-white px-3 py-2">
              <div className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-500">
                Divisions
              </div>

              <label className="flex items-center gap-2 border-b border-slate-100 py-1 text-sm font-semibold text-slate-800">
                <input
                  type="checkbox"
                  checked={divisionFilters.length === 0}
                  onChange={selectAllDivisions}
                />
                <span>All Divisions</span>
              </label>

              {filteredDivisions.map(division => (
                <label key={division.id} className="flex items-center gap-2 py-0.5 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={divisionFilters.includes(division.id)}
                    onChange={() => toggleDivisionFilter(division.id)}
                  />
                  <span className="truncate">{division.name}</span>
                </label>
              ))}

              {filteredDivisions.length === 0 && (
                <div className="text-sm text-slate-500">No divisions</div>
              )}
            </div>

            <select
              value={locationFilter}
              onChange={e => setLocationFilter(e.target.value)}
              className="rounded-xl border border-slate-300 px-4 py-3"
            >
              <option value="">All Locations</option>

              {locations.map(location => (
                <option
                  key={location.id}
                  value={location.id}
                >
                  {location.name}
                </option>
              ))}
            </select>

            <select
              value={weekFilter}
              onChange={e => setWeekFilter(e.target.value)}
              className="rounded-xl border border-slate-300 px-4 py-3"
            >
              <option value="">All Weeks</option>

              {weeks.map(week => (
                <option
                  key={week}
                  value={week}
                >
                  Week {week}
                </option>
              ))}
            </select>

            <select
              value={publishedFilter}
              onChange={e => setPublishedFilter(e.target.value)}
              className="rounded-xl border border-slate-300 px-4 py-3"
            >
              <option value="all">
                Published + Draft
              </option>

              <option value="draft">
                Draft Only
              </option>

              <option value="published">
                Published Only
              </option>
            </select>

            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="rounded-xl border border-slate-300 px-4 py-3"
            >
              <option value="date">Sort by Date</option>
              <option value="location">Sort by Location</option>
              <option value="week">Sort by Week</option>
              <option value="league">Sort by League</option>
              <option value="division">Sort by Division</option>
              <option value="team">Sort by Home Team</option>
            </select>

            <button
              onClick={clearFilters}
              className="rounded-xl bg-slate-200 px-4 py-3 font-semibold hover:bg-slate-300"
            >
              Clear Filters
            </button>

          </div>

        </div>

        <div className="mt-6 rounded-2xl bg-white p-6 shadow">

          <div className="mb-4 flex items-center justify-between">

            <h2 className="text-xl font-bold text-slate-900">
              Scheduled Matches
            </h2>

            <div className="text-sm text-slate-500">
              Draft matches appear in amber · Published matches appear in green
            </div>

          </div>

          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={selectVisibleMatches}
                className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Select Visible
              </button>

              <button
                type="button"
                onClick={() => setSelectedMatchIds([])}
                className="rounded-lg bg-slate-200 px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-300"
              >
                Clear Selection
              </button>

              <button
                type="button"
                disabled={isBulkUpdating || selectedMatchIds.length === 0}
                onClick={balanceSelectedMatches}
                className="rounded-lg bg-blue-700 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
              >
                Home/Away Balance
              </button>

              <button
                type="button"
                disabled={isBulkUpdating || selectedMatchIds.length === 0}
                onClick={() => publishSelectedMatches(true)}
                className="rounded-lg bg-green-700 px-3 py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-50"
              >
                Publish Selected
              </button>

              <button
                type="button"
                disabled={isBulkUpdating || selectedMatchIds.length === 0}
                onClick={() => publishSelectedMatches(false)}
                className="rounded-lg bg-amber-600 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
              >
                Unpublish Selected
              </button>
            </div>

            <div className="text-sm font-semibold text-slate-600">
              {selectedMatchIds.length} selected
            </div>

            <button
              type="button"
              onClick={() => setShowMatchNotes((value) => !value)}
              className="rounded-lg bg-slate-200 px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-300"
            >
              {showMatchNotes ? "Hide Notes" : "Show Notes"}
            </button>
          </div>

          <div className="space-y-2">

            {filteredMatches.map(match => (
              <div
                key={match.id}
                className={`rounded-lg border px-3 py-2 transition-all ${
                  match.is_published
                    ? "border-green-200 bg-green-50"
                    : "border-amber-200 bg-amber-50"
                }`}
              >
                {(() => {
                  const courtUsage = courtUsageForMatch(match);

                  return (
                <div className="grid grid-cols-1 gap-2 xl:grid-cols-[32px_minmax(260px,1.35fr)_130px_120px_minmax(180px,1fr)_130px_85px_minmax(190px,auto)] xl:items-center">
                  <label className="flex items-center xl:justify-center">
                    <input
                      type="checkbox"
                      checked={selectedMatchIds.includes(match.id)}
                      onChange={() => toggleMatchSelection(match.id)}
                      aria-label={`Select ${match.home_team?.name || "Home"} vs ${match.away_team?.name || "Away"}`}
                      className="h-4 w-4"
                    />
                  </label>

                  <div className="min-w-0">
                    <div className="truncate text-sm font-bold text-slate-900">
                      {match.home_team?.name || "Home"} vs {match.away_team?.name || "Away"}
                    </div>
                    <div className="truncate text-xs text-slate-600">
                      {match.leagues?.name || "No League"} · {match.divisions?.name || "No Division"}
                    </div>
                    <div className="text-xs font-semibold text-blue-800">
                      Courts: {courtUsage.used}/{courtUsage.total || "?"} used
                    </div>
                  </div>

                  <input
                    type="date"
                    value={match.scheduled_date || ""}
                    onChange={e => updateMatch(match.id, "scheduled_date", e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                    aria-label="Match date"
                  />

                  <input
                    type="time"
                    value={match.scheduled_time || ""}
                    onChange={e => updateMatch(match.id, "scheduled_time", e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                    aria-label="Match time"
                  />

                  <select
                    value={match.location_id || ""}
                    onChange={e => updateMatch(match.id, "location_id", e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                    aria-label="Match location"
                  >
                    <option value="">No Location</option>
                    {locations.map(location => (
                      <option key={location.id} value={location.id}>
                        {location.name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={match.status || "draft"}
                    onChange={e => updateMatch(match.id, "status", e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                    aria-label="Match status"
                  >
                    <option value="draft">Draft</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="rainout">Rainout</option>
                  </select>

                  <label className="flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Week
                    </span>
                    <input
                      type="number"
                      value={match.week_number || ""}
                      onChange={e => updateMatch(match.id, "week_number", e.target.value)}
                      className="min-w-0 flex-1 border-0 p-0 text-sm outline-none"
                      aria-label="Match week"
                    />
                  </label>

                  <div className="flex w-full flex-wrap gap-1.5 xl:justify-end">
                    <span className={`rounded-full px-2 py-1 text-xs font-bold ${
                      match.is_published
                        ? "bg-green-100 text-green-800"
                        : "bg-amber-100 text-amber-800"
                    }`}>
                      {match.is_published ? "Published" : "Draft"}
                    </span>
                    <button
                      onClick={() => swapHomeAway(match)}
                      className="rounded-lg bg-blue-100 px-2.5 py-1.5 text-xs font-semibold text-blue-800 hover:bg-blue-200"
                    >
                      Swap
                    </button>
                    <button
                      onClick={() => router.push(`/matches/${match.id}`)}
                      className="rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
                    >
                      Open
                    </button>
                    <button
                      onClick={() => deleteMatch(match.id)}
                      className="rounded-lg bg-red-100 px-2.5 py-1.5 text-xs font-semibold text-red-800 hover:bg-red-200"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                  );
                })()}

                {showMatchNotes && (
                  <textarea
                    value={match.notes || ""}
                    onChange={e => updateMatch(match.id, "notes", e.target.value)}
                    className="mt-2 h-9 w-full resize-y rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                    placeholder="Notes"
                    aria-label="Match notes"
                  />
                )}
              </div>
            ))}
            {filteredMatches.length === 0 && (
              <div className="rounded-2xl border border-slate-200 p-10 text-center text-slate-500">
                No matches match the current filters.
              </div>
            )}

          </div>

        </div>

      </div>
    </main>
  );
}




