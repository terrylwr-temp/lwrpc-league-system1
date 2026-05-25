"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppHeader from "../components/AppHeader";
import { requireRole, supabase } from "../lib/auth";
import { formatDisplayDate } from "../lib/dateTime";
import { confirmDeleteAction } from "../lib/confirmDelete";

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
  const [teamNameFilter, setTeamNameFilter] = useState("");
  const [matchSearch, setMatchSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [weekFilter, setWeekFilter] = useState("");
  const [publishedFilter, setPublishedFilter] = useState("all");
  const [sortBy, setSortBy] = useState("date");
  const [showMatchNotes, setShowMatchNotes] = useState(false);
  const [showHomeAwayCounts, setShowHomeAwayCounts] = useState(false);
  const [selectedMatchIds, setSelectedMatchIds] = useState([]);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [collapsedMatchGroups, setCollapsedMatchGroups] = useState({});

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
      .select("id, name, is_active, seasons(is_active)")
      .order("name", { ascending: true });

    const { data: divisionData } = await supabase
      .from("divisions")
      .select("id, name, league_id, is_active")
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
      .select("id, name, division_id, home_location_id, is_active");

    const { data: availabilityData } = await supabase
      .from("location_court_availability")
      .select("*");

    const { data: blackoutData } = await supabase
      .from("league_blackout_dates")
      .select("*");

    setMatches(matchData || []);
    setLeagues((leagueData || []).filter((league) => league.is_active !== false && league.seasons?.is_active !== false));
    setDivisions((divisionData || []).filter((division) => division.is_active !== false));
    setLocations(locationData || []);
    setScheduleSettings(settingsData || []);
    setTeams((teamData || []).filter((team) => team.is_active !== false));
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

  function courtUsageForMatch(match, sourceMatches = matches) {
    if (!match.location_id || !match.scheduled_date) {
      return { used: 0, total: Number(match.locations?.number_of_courts || 0) };
    }

    const location = locations.find((loc) => String(loc.id) === String(match.location_id));
    const total = Number(location?.number_of_courts ?? match.locations?.number_of_courts ?? 0);
    const unavailable = availability
      .filter((row) =>
        isAvailabilityMatch(
          row,
          match.location_id,
          match.scheduled_date,
          match.scheduled_time
        )
      )
      .reduce((sum, row) => sum + Number(row.courts_unavailable ?? row.courts_available ?? 0), 0);
    const used = sourceMatches
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
      total,
      unavailable,
      available: total ? Math.max(total - unavailable, 0) : 0,
      hasIssue: Boolean(total && used > Math.max(total - unavailable, 0)),
    };
  }

  function locationName(locationId) {
    return locations.find((location) => String(location.id) === String(locationId))?.name || "No Location";
  }

  function courtUsageTextForMatch(match, sourceMatches = matches) {
    const usage = courtUsageForMatch(match, sourceMatches);
    return `${usage.used}/${usage.available || usage.total || "?"} courts used`;
  }

  function courtIssueReasonForMatch(match, sourceMatches = matches) {
    const usage = courtUsageForMatch(match, sourceMatches);

    if (usage.unavailable > 0 && usage.hasIssue) {
      return `${locationName(match.location_id)} has ${usage.unavailable} court${usage.unavailable === 1 ? "" : "s"} blocked by Court Unavailability at this date/time.`;
    }

    if (usage.hasIssue) {
      return `${locationName(match.location_id)} may not have enough courts at this date/time.`;
    }

    return "";
  }

  function formatDate(value) {
    return formatDisplayDate(value, "No Date");
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

  function matchHasScheduleIssue(match) {
    return courtUsageForMatch(match).hasIssue || isLeagueBlackoutDate(match);
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
    const match = matches.find((row) => row.id === matchId);
    if (isMatchLocked(match)) {
      alert("Completed and verified matches are locked. Use Reset Scores before changing them.");
      return;
    }

    setSelectedMatchIds((current) =>
      current.includes(matchId)
        ? current.filter((id) => id !== matchId)
        : [...current, matchId]
    );
  }

  function selectVisibleMatches() {
    setSelectedMatchIds(filteredMatches.filter((match) => !isMatchLocked(match)).map((match) => match.id));
  }

  async function publishSelectedMatches(shouldPublish) {
    const selected = getSelectedMatches();

    if (selected.length === 0) {
      alert("Select one or more matches first.");
      return;
    }

    if (selected.some(isMatchLocked)) {
      alert("Completed and verified matches are locked. Use Reset Scores before changing schedule or publish status.");
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

    if (selected.some(isMatchLocked)) {
      alert("Completed and verified matches are locked. Use Reset Scores before changing teams or locations.");
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
    if (isMatchLocked(match)) {
      alert("This match is completed and verified. Use Reset Scores before changing teams or schedule details.");
      return;
    }

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

    const proposedMatches = matches.map((row) => (row.id === match.id ? proposedMatch : row));

    if (!wouldHaveEnoughCourts(proposedMatches, proposedMatch)) {
      const ok = confirm(
        [
          `Swap ${match.home_team?.name || "Home"} and ${match.away_team?.name || "Away"} anyway?`,
          "",
          courtIssueReasonForMatch(proposedMatch, proposedMatches) || `${locationName(newLocationId)} may not have enough available courts at this date/time.`,
          `Proposed: ${courtUsageTextForMatch(proposedMatch, proposedMatches)}`,
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
    const match = matches.find((row) => row.id === matchId);
    if (isMatchLocked(match)) {
      alert("This match is completed and verified. Use Reset Scores before changing schedule details.");
      return;
    }

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

  async function deleteMatch(match) {
    if (isMatchLocked(match)) {
      alert("This match is completed and verified. Use Reset Scores before deleting it.");
      return;
    }

    const ok = confirmDeleteAction({
      title: "Delete this match and its generated game rows?",
      details: "This deletes the match, match lines, and individual game score rows. Any entered players, scores, verification state, DUPR export readiness, and standings impact for this match will be lost.",
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

  async function resetMatch(match) {
    const response = window.prompt(
      [
        `Reset ${match.home_team?.name || "Home"} vs ${match.away_team?.name || "Away"}?`,
        "This clears selected score-entry players, all game scores, winners, score verification/dispute state, and DUPR export status.",
        "Saved Match Setup teams will remain.",
        "The scheduled match, date, time, location, teams, week, and published status will remain.",
        'Type "RESET" to continue.',
      ].join("\n\n")
    );

    if (response !== "RESET") return;

    const { data: linesToReset, error: findLineError } = await supabase
      .from("match_lines")
      .select("id")
      .eq("match_id", match.id);

    if (findLineError) {
      alert(findLineError.message);
      return;
    }

    const lineIds = (linesToReset || []).map((line) => line.id);

    if (lineIds.length > 0) {
      const { error: gameError } = await supabase
        .from("line_games")
        .update({
          home_score: null,
          away_score: null,
          game_status: "scheduled",
          updated_at: new Date().toISOString(),
        })
        .in("match_line_id", lineIds);

      if (gameError) {
        alert(gameError.message);
        return;
      }

      const { error: lineError } = await supabase
        .from("match_lines")
        .update({
          home_player_1_id: null,
          home_player_2_id: null,
          away_player_1_id: null,
          away_player_2_id: null,
          winning_team_id: null,
          home_team_games_won: 0,
          away_team_games_won: 0,
          home_team_points: 0,
          away_team_points: 0,
          line_status: "scheduled",
          updated_at: new Date().toISOString(),
        })
        .eq("match_id", match.id);

      if (lineError) {
        alert(lineError.message);
        return;
      }
    }

    const { error: matchError } = await supabase
      .from("matches")
      .update({
        status: "scheduled",
        score_status: "not_entered",
        home_score: null,
        away_score: null,
        winning_team_id: null,
        score_entered_by_member_id: null,
        score_entered_at: null,
        score_verified_by_member_id: null,
        score_verified_at: null,
        finalized_at: null,
        score_disputed: false,
        score_dispute_notes: null,
        score_exported_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", match.id);

    if (matchError) {
      alert(matchError.message);
      return;
    }

    await rebuildDivisionStandings(match.division_id);
    alert("Scores reset. Saved Match Setup teams were preserved.");
    loadData();
  }

  async function rebuildDivisionStandings(divisionId) {
    if (!divisionId) return;

    const { data: division, error: divisionError } = await supabase
      .from("divisions")
      .select("*")
      .eq("id", divisionId)
      .single();

    if (divisionError) {
      alert(divisionError.message);
      return;
    }

    const { data: completedMatches, error } = await supabase
      .from("matches")
      .select(`
        *,
        match_lines (
          *,
          winning_team_id,
          home_team_games_won,
          away_team_games_won,
          home_team_points,
          away_team_points,
          division_lines (
            team_win_points
          )
        )
      `)
      .eq("division_id", divisionId)
      .eq("status", "completed")
      .order("scheduled_date", { ascending: true });

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
          recentResults: [],
        };
      }

      return standingsMap[teamId];
    }

    (completedMatches || []).forEach((matchRow) => {
      const home = ensureTeam(matchRow.home_team_id);
      const away = ensureTeam(matchRow.away_team_id);

      home.matches_played += 1;
      away.matches_played += 1;

      let homeLinesWon = 0;
      let awayLinesWon = 0;

      (matchRow.match_lines || []).forEach((line) => {
        const hg = Number(line.home_team_games_won || 0);
        const ag = Number(line.away_team_games_won || 0);
        const hp = Number(line.home_team_points || 0);
        const ap = Number(line.away_team_points || 0);
        const teamWinPoints = Number(line.division_lines?.team_win_points ?? 1);

        home.game_wins += hg;
        home.game_losses += ag;
        away.game_wins += ag;
        away.game_losses += hg;
        home.points_for += hp;
        home.points_against += ap;
        away.points_for += ap;
        away.points_against += hp;
        home.standings_points += hg * teamWinPoints;
        away.standings_points += ag * teamWinPoints;

        if (line.winning_team_id === matchRow.home_team_id) {
          home.line_wins += 1;
          away.line_losses += 1;
          homeLinesWon += 1;
        } else if (line.winning_team_id === matchRow.away_team_id) {
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
        home.recentResults.push("W");
        away.recentResults.push("L");
      } else if (awayLinesWon > homeLinesWon) {
        away.match_wins += 1;
        home.match_losses += 1;
        away.away_wins += 1;
        home.home_losses += 1;
        away.recentResults.push("W");
        home.recentResults.push("L");
      } else {
        home.match_ties += 1;
        away.match_ties += 1;
        home.recentResults.push("T");
        away.recentResults.push("T");
      }
    });

    const ordered = Object.values(standingsMap).map((team) => {
      team.point_differential = team.points_for - team.points_against;
      const recent = team.recentResults.slice(-5);
      team.recent_form = recent.join("");

      if (recent.length > 0) {
        const last = recent[recent.length - 1];
        let streak = 0;

        for (let i = recent.length - 1; i >= 0; i--) {
          if (recent[i] === last) streak += 1;
          else break;
        }

        team.current_streak = last + streak;
      } else {
        team.current_streak = "-";
      }

      delete team.recentResults;
      return team;
    });

    ordered.sort((a, b) => {
      const rules = [
        division.standings_tiebreak_1,
        division.standings_tiebreak_2,
        division.standings_tiebreak_3,
      ];

      for (const rule of rules) {
        if ((b[rule] || 0) !== (a[rule] || 0)) {
          return (b[rule] || 0) - (a[rule] || 0);
        }
      }

      return 0;
    });

    ordered.forEach((team, index) => {
      team.rank = index + 1;
      team.updated_at = new Date().toISOString();
    });

    await supabase.from("team_standings").delete().eq("division_id", divisionId);

    if (ordered.length > 0) {
      const { error: insertError } = await supabase.from("team_standings").insert(ordered);

      if (insertError) alert(insertError.message);
    }
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
        teamNameFilter &&
        !`${match.home_team?.name || ""} ${match.away_team?.name || ""}`
          .toLowerCase()
          .includes(teamNameFilter.trim().toLowerCase())
      ) return false;

      if (matchSearch) {
        const q = matchSearch.trim().toLowerCase();
        const text = [
          match.home_team?.name,
          match.away_team?.name,
          match.leagues?.name,
          match.divisions?.name,
          match.locations?.name,
          match.scheduled_date,
          match.week_number,
          match.status,
          match.score_status,
        ].join(" ").toLowerCase();

        if (!text.includes(q)) return false;
      }

      if (
        dateFilter &&
        match.scheduled_date !== dateFilter
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
      return dateCompare || teamCompare || locationCompare;
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

  const homeAwayCounts = (() => {
    const counts = new Map();

    filteredMatches.forEach((match) => {
      [
        { team: match.home_team, teamId: match.home_team_id, side: "home" },
        { team: match.away_team, teamId: match.away_team_id, side: "away" },
      ].forEach(({ team, teamId, side }) => {
        if (!teamId) return;

        const divisionName = match.divisions?.name || "No Division";
        const key = `${match.division_id || "none"}:${teamId}`;
        const current = counts.get(key) || {
          key,
          divisionName,
          teamName: team?.name || "Unknown Team",
          home: 0,
          away: 0,
          total: 0,
        };

        current[side] += 1;
        current.total += 1;
        counts.set(key, current);
      });
    });

    return [...counts.values()].sort((a, b) =>
      a.divisionName.localeCompare(b.divisionName) ||
      a.teamName.localeCompare(b.teamName)
    );
  })();

  const problemMatchCount = filteredMatches.filter((match) => matchHasScheduleIssue(match)).length;

  function scheduleGroupForMatch(match) {
    if (sortBy === "location") {
      const name = match.locations?.name || "No Location";
      return { key: `location:${name}`, label: name };
    }

    if (sortBy === "week") {
      const week = match.week_number || "No Week";
      return { key: `week:${week}`, label: `Week ${week}` };
    }

    if (sortBy === "league") {
      const name = match.leagues?.name || "No League";
      return { key: `league:${name}`, label: name };
    }

    if (sortBy === "division") {
      const name = match.divisions?.name || "No Division";
      return { key: `division:${name}`, label: name };
    }

    if (sortBy === "team") {
      const name = match.home_team?.name || "No Home Team";
      return { key: `team:${name}`, label: name };
    }

    const date = match.scheduled_date || "No Date";
    return { key: `date:${date}`, label: formatDate(date) };
  }

  const groupedFilteredMatches = (() => {
    const groups = new Map();

    filteredMatches.forEach((match) => {
      const group = scheduleGroupForMatch(match);
      const current = groups.get(group.key) || {
        key: group.key,
        label: group.label,
        matches: [],
        issueCount: 0,
      };

      current.matches.push(match);
      if (matchHasScheduleIssue(match)) current.issueCount += 1;
      groups.set(group.key, current);
    });

    return [...groups.values()];
  })();

  function toggleMatchGroup(groupKey) {
    setCollapsedMatchGroups((current) => ({
      ...current,
      [groupKey]: current[groupKey] !== false ? false : true,
    }));
  }

  function renderScheduledMatch(match) {
    const courtUsage = courtUsageForMatch(match);
    const locked = isMatchLocked(match);

    return (
      <div
        key={match.id}
        className={`rounded-lg border px-3 py-2 transition-all ${
          matchHasScheduleIssue(match)
            ? "border-red-300 bg-red-50 ring-1 ring-red-200"
            : match.is_published
            ? "border-green-200 bg-green-50"
            : "border-amber-200 bg-amber-50"
        }`}
      >
        <div className="grid grid-cols-1 gap-2 xl:grid-cols-[32px_minmax(320px,1.7fr)_130px_120px_minmax(180px,1fr)_130px_minmax(190px,auto)] xl:items-center">
          <label className="flex items-center xl:justify-center">
            <input
              type="checkbox"
              checked={selectedMatchIds.includes(match.id)}
              onChange={() => toggleMatchSelection(match.id)}
              disabled={locked}
              aria-label={`Select ${match.home_team?.name || "Home"} vs ${match.away_team?.name || "Away"}`}
              className="h-4 w-4 disabled:cursor-not-allowed"
            />
          </label>

          <div className="min-w-0">
            <div className="truncate text-sm font-bold text-slate-900">
              {match.home_team?.name || "Home"} vs {match.away_team?.name || "Away"}
            </div>
            <div className="truncate text-xs text-slate-600">
              {match.leagues?.name || "No League"} · {match.divisions?.name || "No Division"}
            </div>
            <div className={`text-xs font-semibold ${courtUsage.hasIssue ? "text-red-800" : "text-blue-800"}`}>
              Courts: {courtUsage.used}/{courtUsage.available || courtUsage.total || "?"} used
              {courtUsage.unavailable ? ` (${courtUsage.unavailable} unavailable)` : ""}
              {courtUsage.hasIssue ? " - Overbooked" : ""}
              {isLeagueBlackoutDate(match) ? " - Blackout date" : ""}
            </div>
            {locked && (
              <div className="mt-1 text-xs font-black uppercase tracking-wide text-slate-500">
                Locked: completed and verified
              </div>
            )}
          </div>

          <input
            type="date"
            value={match.scheduled_date || ""}
            onChange={e => updateMatch(match.id, "scheduled_date", e.target.value)}
            disabled={locked}
            className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm disabled:bg-slate-100 disabled:text-slate-500"
            aria-label="Match date"
          />

          <input
            type="time"
            value={match.scheduled_time || ""}
            onChange={e => updateMatch(match.id, "scheduled_time", e.target.value)}
            disabled={locked}
            className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm disabled:bg-slate-100 disabled:text-slate-500"
            aria-label="Match time"
          />

          <select
            value={match.location_id || ""}
            onChange={e => updateMatch(match.id, "location_id", e.target.value)}
            disabled={locked}
            className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm disabled:bg-slate-100 disabled:text-slate-500"
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
            disabled={locked}
            className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm disabled:bg-slate-100 disabled:text-slate-500"
            aria-label="Match status"
          >
            <option value="draft">Draft</option>
            <option value="scheduled">Scheduled</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="rainout">Rainout</option>
          </select>

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
              disabled={locked}
              className="rounded-lg bg-blue-100 px-2.5 py-1.5 text-xs font-semibold text-blue-800 hover:bg-blue-200 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
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
              onClick={() => resetMatch(match)}
              className="rounded-lg bg-orange-100 px-2.5 py-1.5 text-xs font-semibold text-orange-900 hover:bg-orange-200"
            >
              Reset Scores
            </button>
            <button
              onClick={() => deleteMatch(match)}
              disabled={locked}
              className="rounded-lg bg-red-100 px-2.5 py-1.5 text-xs font-semibold text-red-800 hover:bg-red-200 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
            >
              Delete
            </button>
          </div>
        </div>

        {showMatchNotes && (
          <textarea
            value={match.notes || ""}
            onChange={e => updateMatch(match.id, "notes", e.target.value)}
            disabled={locked}
            className="mt-2 h-9 w-full resize-y rounded-lg border border-slate-300 px-2 py-1.5 text-sm disabled:bg-slate-100 disabled:text-slate-500"
            placeholder="Notes"
            aria-label="Match notes"
          />
        )}
      </div>
    );
  }

  function clearFilters() {
    setLeagueFilter("");
    setDivisionFilters([]);
    setLocationFilter("");
    setTeamNameFilter("");
    setMatchSearch("");
    setDateFilter("");
    setWeekFilter("");
    setPublishedFilter("all");
    setSortBy("date");
    setSelectedMatchIds([]);
    setCollapsedMatchGroups({});
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

          <div className="grid grid-cols-1 gap-3 md:grid-cols-12">

            <select
              value={leagueFilter}
              onChange={e => {
                setLeagueFilter(e.target.value);
                setDivisionFilters([]);
              }}
              className="rounded-xl border border-slate-300 px-4 py-3 md:col-span-2"
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

            <div className="max-h-32 overflow-y-auto rounded-xl border border-slate-300 bg-white px-3 py-2 md:col-span-4">
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
              className="rounded-xl border border-slate-300 px-4 py-3 md:col-span-2"
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
              className="rounded-xl border border-slate-300 px-4 py-3 md:col-span-2"
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

            <input
              type="search"
              value={teamNameFilter}
              onChange={e => setTeamNameFilter(e.target.value)}
              placeholder="Team name"
              className="rounded-xl border border-slate-300 px-4 py-3 md:col-span-3"
            />

            <input
              type="search"
              value={matchSearch}
              onChange={e => setMatchSearch(e.target.value)}
              placeholder="Keyword search"
              title="Searches league, division, teams, location, status, date, and notes."
              className="rounded-xl border border-slate-300 px-4 py-3 md:col-span-3"
            />

            <input
              type="date"
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value)}
              className="rounded-xl border border-slate-300 px-4 py-3 md:col-span-3"
              aria-label="Specific match date"
            />

            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="rounded-xl border border-slate-300 px-4 py-3 md:col-span-3"
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

          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">

            <h2 className="text-xl font-bold text-slate-900">
              Scheduled Matches
            </h2>

            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-slate-500">
                Draft matches appear in amber · Published matches appear in green
              </span>
              <span className={`rounded-full px-3 py-1 text-xs font-black ${
                problemMatchCount > 0
                  ? "bg-red-100 text-red-800"
                  : "bg-emerald-100 text-emerald-800"
              }`}>
                {problemMatchCount} problem match{problemMatchCount === 1 ? "" : "es"}
              </span>
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
                onClick={() => setShowHomeAwayCounts(true)}
                className="rounded-lg bg-indigo-100 px-3 py-2 text-sm font-semibold text-indigo-900 hover:bg-indigo-200"
              >
                Home/Away Counts
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

          <div className="space-y-3">

            {groupedFilteredMatches.map((group) => {
              const isCollapsed = collapsedMatchGroups[group.key] !== false;

              return (
                <section key={group.key} className="overflow-hidden rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => toggleMatchGroup(group.key)}
                    className="flex w-full flex-wrap items-center justify-between gap-3 bg-slate-900 px-4 py-3 text-left text-white hover:bg-slate-800"
                  >
                    <span className="min-w-0 break-words text-sm font-black">
                      {group.label}
                    </span>
                    <span className="flex flex-wrap items-center gap-2 text-xs font-bold">
                      <span className="rounded-full bg-white/15 px-2.5 py-1">
                        {group.matches.length} match{group.matches.length === 1 ? "" : "es"}
                      </span>
                      {group.issueCount > 0 && (
                        <span className="rounded-full bg-red-100 px-2.5 py-1 text-red-800">
                          {group.issueCount} problem{group.issueCount === 1 ? "" : "s"}
                        </span>
                      )}
                      <span>{isCollapsed ? "Open" : "Close"}</span>
                    </span>
                  </button>

                  {!isCollapsed && (
                    <div className="space-y-2 bg-white p-2">
                      {group.matches.map((match) => renderScheduledMatch(match))}
                    </div>
                  )}
                </section>
              );
            })}
            {filteredMatches.length === 0 && (
              <div className="rounded-2xl border border-slate-200 p-10 text-center text-slate-500">
                No matches match the current filters.
              </div>
            )}

          </div>

        </div>

        {showHomeAwayCounts && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
            <div className="max-h-[85vh] w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Home / Away Counts</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Counts are based on the matches currently shown by the filters.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowHomeAwayCounts(false)}
                  className="rounded-lg bg-slate-200 px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-300"
                >
                  Close
                </button>
              </div>

              <div className="max-h-[65vh] overflow-auto p-6">
                <table className="w-full border-collapse text-sm">
                  <thead className="sticky top-0 bg-slate-900 text-left text-white">
                    <tr>
                      <th className="px-3 py-2">Division</th>
                      <th className="px-3 py-2">Team</th>
                      <th className="px-3 py-2 text-right">Home</th>
                      <th className="px-3 py-2 text-right">Away</th>
                      <th className="px-3 py-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {homeAwayCounts.map((row) => (
                      <tr key={row.key} className="border-b border-slate-100">
                        <td className="px-3 py-2 font-semibold text-slate-800">{row.divisionName}</td>
                        <td className="px-3 py-2 text-slate-700">{row.teamName}</td>
                        <td className="px-3 py-2 text-right font-bold text-slate-900">{row.home}</td>
                        <td className="px-3 py-2 text-right font-bold text-slate-900">{row.away}</td>
                        <td className="px-3 py-2 text-right font-bold text-slate-900">{row.total}</td>
                      </tr>
                    ))}

                    {homeAwayCounts.length === 0 && (
                      <tr>
                        <td colSpan="5" className="px-3 py-8 text-center text-slate-500">
                          No matches are visible with the current filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}

function isMatchLocked(match) {
  return match?.status === "completed" && match?.score_status === "verified";
}
