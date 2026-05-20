"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppHeader from "../components/AppHeader";
import { requireRole, supabase } from "../lib/auth";
import { confirmDeleteAction } from "../lib/confirmDelete";

export default function SchedulingPage() {
  const router = useRouter();

  const [activeSection, setActiveSection] = useState("settings");
  const [matches, setMatches] = useState([]);
  const [isGeneratingSchedule, setIsGeneratingSchedule] = useState(false);

  const [leagues, setLeagues] = useState([]);
  const [divisions, setDivisions] = useState([]);
  const [locations, setLocations] = useState([]);
  const [settings, setSettings] = useState([]);
  const [availability, setAvailability] = useState([]);
  const [leagueBlackouts, setLeagueBlackouts] = useState([]);

  const [editingSettingId, setEditingSettingId] = useState(null);
  const [editingAvailabilityId, setEditingAvailabilityId] = useState(null);
  const [editingLeagueBlackoutId, setEditingLeagueBlackoutId] = useState(null);

  const [selectedLeague, setSelectedLeague] = useState("");
  const [selectedDivision, setSelectedDivision] = useState("");
  const [settingName, setSettingName] = useState("");
  const [seasonStart, setSeasonStart] = useState("");
  const [seasonEnd, setSeasonEnd] = useState("");
  const [defaultMatchDay, setDefaultMatchDay] = useState("");
  const [defaultMatchTime, setDefaultMatchTime] = useState("");
  const [courtsNeededPerMatch, setCourtsNeededPerMatch] = useState("4");
  const [actualScheduleWeeks, setActualScheduleWeeks] = useState("");
  const [everyOtherWeek, setEveryOtherWeek] = useState(false);
  const [allowByes, setAllowByes] = useState(true);
  const [notes, setNotes] = useState("");

  const [availabilityLocation, setAvailabilityLocation] = useState("");
  const [dayOfWeek, setDayOfWeek] = useState("");
  const [specificDate, setSpecificDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [courtsUnavailable, setCourtsUnavailable] = useState("0");
  const [availabilityNotes, setAvailabilityNotes] = useState("");

  const [blackoutLeague, setBlackoutLeague] = useState("");
  const [blackoutDivision, setBlackoutDivision] = useState("");
  const [blackoutDate, setBlackoutDate] = useState("");
  const [blackoutReason, setBlackoutReason] = useState("");

  const checkAuth = useCallback(async function checkAuth() {
    const user = await requireRole(router, "league_manager");
    return !!user;
  }, [router]);

  const loadData = useCallback(async function loadData() {
    const { data: leagueData, error: leagueError } = await supabase
      .from("leagues")
      .select("id, name")
      .order("name", { ascending: true });
    if (leagueError) return alert(leagueError.message);

    const { data: divisionData, error: divisionError } = await supabase
      .from("divisions")
      .select("id, name, league_id")
      .order("name", { ascending: true });
    if (divisionError) return alert(divisionError.message);

    const { data: locationData, error: locationError } = await supabase
      .from("locations")
      .select("id, name, number_of_courts")
      .order("name", { ascending: true });
    if (locationError) return alert(locationError.message);

    const { data: settingsData, error: settingsError } = await supabase
      .from("league_schedule_settings")
      .select("*, leagues(name), divisions(name)")
      .order("created_at", { ascending: false });
    if (settingsError) return alert(settingsError.message);

    const { data: availabilityData, error: availabilityError } = await supabase
      .from("location_court_availability")
      .select("*, locations(name)")
      .order("specific_date", { ascending: true });
    if (availabilityError) return alert(availabilityError.message);

    const { data: leagueBlackoutData, error: blackoutError } = await supabase
      .from("league_blackout_dates")
      .select("*, leagues(name), divisions(name)")
      .order("blackout_date", { ascending: true });
    if (blackoutError) return alert(blackoutError.message);

    const { data: matchData, error: matchError } = await supabase
      .from("matches")
      .select("*");
    if (matchError) return alert(matchError.message);

    setLeagues(leagueData || []);
    setDivisions(divisionData || []);
    setLocations(locationData || []);
    setSettings(settingsData || []);
    setAvailability(availabilityData || []);
    setLeagueBlackouts(leagueBlackoutData || []);
    setMatches(matchData || []);
  }, []);

  useEffect(() => {
    async function run() {
      const ok = await checkAuth();
      if (ok) await loadData();
    }

    run();
  }, [checkAuth, loadData]);

  const filteredDivisions = useMemo(() => {
    if (!selectedLeague) return [];
    return divisions.filter((division) => division.league_id === selectedLeague);
  }, [divisions, selectedLeague]);

  const filteredBlackoutDivisions = useMemo(() => {
    if (!blackoutLeague) return [];
    return divisions.filter((division) => division.league_id === blackoutLeague);
  }, [divisions, blackoutLeague]);

  function getSeasonWeeks(startDate, endDate) {
    if (!startDate || !endDate) return "";
    const start = new Date(`${startDate}T12:00:00`);
    const end = new Date(`${endDate}T12:00:00`);
    if (end < start) return "Invalid dates";
    const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    return Math.ceil(diffDays / 7);
  }

  function seasonWeeksLabel(startDate, endDate) {
    const weeks = getSeasonWeeks(startDate, endDate);
    if (!weeks) return "";
    if (weeks === "Invalid dates") return weeks;
    return `${weeks} Weeks`;
  }

  function dayName(value) {
    if (value === null || value === undefined || value === "") return "";
    const days = {
      0: "Sunday",
      1: "Monday",
      2: "Tuesday",
      3: "Wednesday",
      4: "Thursday",
      5: "Friday",
      6: "Saturday",
      sunday: "Sunday",
      monday: "Monday",
      tuesday: "Tuesday",
      wednesday: "Wednesday",
      thursday: "Thursday",
      friday: "Friday",
      saturday: "Saturday",
    };
    return days[String(value).toLowerCase()] || value;
  }

  async function saveScheduleSettings(e) {
    e.preventDefault();

    const payload = {
      league_id: selectedLeague || null,
      division_id: selectedDivision || null,
      name: settingName || null,
      season_start_date: seasonStart || null,
      season_end_date: seasonEnd || null,
      default_match_day: defaultMatchDay || null,
      default_match_time: defaultMatchTime || null,
      courts_needed_per_match: Number(courtsNeededPerMatch || 1),
      actual_schedule_weeks: Number(actualScheduleWeeks || getSeasonWeeks(seasonStart, seasonEnd) || 0) || null,
      every_other_week: everyOtherWeek,
      allow_byes: allowByes,
      schedule_status: "draft",
      notes: notes || null,
      updated_at: new Date().toISOString(),
    };

    const result = editingSettingId
      ? await supabase.from("league_schedule_settings").update(payload).eq("id", editingSettingId)
      : await supabase.from("league_schedule_settings").insert(payload);

    if (result.error) return alert(result.error.message);

    clearSettingsForm();
    await loadData();
  }

  async function saveAvailability(e) {
    e.preventDefault();

    if (!availabilityLocation) {
      alert("Select a location");
      return;
    }

    const payload = {
      location_id: availabilityLocation,
      day_of_week: dayOfWeek || null,
      specific_date: specificDate || null,
      start_time: startTime || null,
      end_time: endTime || null,
      courts_unavailable: Number(courtsUnavailable || 0),
      notes: availabilityNotes || null,
      updated_at: new Date().toISOString(),
    };

    const result = editingAvailabilityId
      ? await supabase.from("location_court_availability").update(payload).eq("id", editingAvailabilityId)
      : await supabase.from("location_court_availability").insert(payload);

    if (result.error) return alert(result.error.message);

    clearAvailabilityForm();
    await loadData();
  }

  async function saveLeagueBlackout(e) {
    e.preventDefault();

    if (!blackoutLeague || !blackoutDate) {
      alert("League and blackout date are required");
      return;
    }

    const payload = {
      league_id: blackoutLeague,
      division_id: blackoutDivision || null,
      blackout_date: blackoutDate,
      reason: blackoutReason || null,
      updated_at: new Date().toISOString(),
    };

    const result = editingLeagueBlackoutId
      ? await supabase.from("league_blackout_dates").update(payload).eq("id", editingLeagueBlackoutId)
      : await supabase.from("league_blackout_dates").insert(payload);

    if (result.error) return alert(result.error.message);

    clearLeagueBlackoutForm();
    await loadData();
  }

  function editSetting(setting) {
    setEditingSettingId(setting.id);
    setActiveSection("settings");
    setSelectedLeague(setting.league_id || "");
    setSelectedDivision(setting.division_id || "");
    setSettingName(setting.name || "");
    setSeasonStart(setting.season_start_date || "");
    setSeasonEnd(setting.season_end_date || "");
    setDefaultMatchDay(setting.default_match_day || "");
    setDefaultMatchTime(setting.default_match_time || "");
    setCourtsNeededPerMatch(String(setting.courts_needed_per_match || 4));
    setActualScheduleWeeks(String(setting.actual_schedule_weeks || getSeasonWeeks(setting.season_start_date, setting.season_end_date) || ""));
    setEveryOtherWeek(setting.every_other_week === true);
    setAllowByes(setting.allow_byes !== false);
    setNotes(setting.notes || "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteSetting(settingId) {
    if (!confirmDeleteAction({
      title: "Delete this schedule setting?",
      details: "This deletes the saved schedule generation settings only. Existing generated matches are not deleted, but you will lose this reusable scheduling setup.",
    })) return;

    const { error } = await supabase
      .from("league_schedule_settings")
      .delete()
      .eq("id", settingId);

    if (error) return alert(error.message);
    if (editingSettingId === settingId) clearSettingsForm();
    await loadData();
  }

  function editAvailability(row) {
    setEditingAvailabilityId(row.id);
    setActiveSection("courts");
    setAvailabilityLocation(row.location_id || "");
    setDayOfWeek(row.day_of_week || "");
    setSpecificDate(row.specific_date || "");
    setStartTime(row.start_time || "");
    setEndTime(row.end_time || "");
    setCourtsUnavailable(String(row.courts_unavailable ?? row.courts_available ?? 0));
    setAvailabilityNotes(row.notes || "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteAvailability(rowId) {
    if (!confirmDeleteAction({
      title: "Delete this court unavailability / blackout record?",
      details: "This removes the court availability restriction. Future generated schedules may use this location/date/time again.",
    })) return;

    const { error } = await supabase
      .from("location_court_availability")
      .delete()
      .eq("id", rowId);

    if (error) return alert(error.message);
    if (editingAvailabilityId === rowId) clearAvailabilityForm();
    await loadData();
  }

  function editLeagueBlackout(row) {
    setEditingLeagueBlackoutId(row.id);
    setActiveSection("blackouts");
    setBlackoutLeague(row.league_id || "");
    setBlackoutDivision(row.division_id || "");
    setBlackoutDate(row.blackout_date || "");
    setBlackoutReason(row.reason || "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteLeagueBlackout(id) {
    if (!confirmDeleteAction({
      title: "Delete this league blackout date?",
      details: "This removes the blackout restriction. Future generated schedules may place matches on this date again.",
    })) return;

    const { error } = await supabase
      .from("league_blackout_dates")
      .delete()
      .eq("id", id);

    if (error) return alert(error.message);
    if (editingLeagueBlackoutId === id) clearLeagueBlackoutForm();
    await loadData();
  }

  function clearSettingsForm() {
    setEditingSettingId(null);
    setSelectedLeague("");
    setSelectedDivision("");
    setSettingName("");
    setSeasonStart("");
    setSeasonEnd("");
    setDefaultMatchDay("");
    setDefaultMatchTime("");
    setCourtsNeededPerMatch("4");
    setActualScheduleWeeks("");
    setEveryOtherWeek(false);
    setAllowByes(true);
    setNotes("");
  }

  function clearAvailabilityForm() {
    setEditingAvailabilityId(null);
    setAvailabilityLocation("");
    setDayOfWeek("");
    setSpecificDate("");
    setStartTime("");
    setEndTime("");
    setCourtsUnavailable("0");
    setAvailabilityNotes("");
  }

  function clearLeagueBlackoutForm() {
    setEditingLeagueBlackoutId(null);
    setBlackoutLeague("");
    setBlackoutDivision("");
    setBlackoutDate("");
    setBlackoutReason("");
  }

  function generateRoundRobin(teamList) {
    const list = [...teamList];
    if (list.length % 2 === 1) list.push({ id: "BYE", name: "BYE" });

    const rounds = [];
    const teamCount = list.length;

    for (let round = 0; round < teamCount - 1; round++) {
      const games = [];

      for (let i = 0; i < teamCount / 2; i++) {
        const home = list[i];
        const away = list[teamCount - 1 - i];

        games.push({
          home_team_id: round % 2 === 0 ? home.id : away.id,
          away_team_id: round % 2 === 0 ? away.id : home.id,
          is_bye: home.id === "BYE" || away.id === "BYE",
        });
      }

      rounds.push(games);
      const fixed = list[0];
      const rotating = list.slice(1);
      rotating.unshift(rotating.pop());
      list.splice(0, list.length, fixed, ...rotating);
    }

    return rounds;
  }

  function getDayNumber(value) {
    const days = {
      sunday: 0,
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6,
    };

    if (value === null || value === undefined || value === "") return null;
    const normalized = String(value).toLowerCase();
    if (days[normalized] !== undefined) return days[normalized];

    const numberValue = Number(value);
    if (Number.isNaN(numberValue) || numberValue < 0 || numberValue > 6) return null;
    return numberValue;
  }

  function getNextDateForDay(startDate, dayOfWeek, weekOffset) {
    const targetDay = getDayNumber(dayOfWeek);
    if (targetDay === null) throw new Error("Invalid default match day in Schedule Settings.");

    const date = new Date(`${startDate}T12:00:00`);
    let safety = 0;

    while (date.getDay() !== targetDay && safety < 7) {
      date.setDate(date.getDate() + 1);
      safety += 1;
    }

    date.setDate(date.getDate() + weekOffset * 7);
    return date.toISOString().slice(0, 10);
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

  function getCourtsAlreadyUsed(locationId, matchDate, matchTime, courtsNeeded) {
    return matches.filter((match) => {
      return (
        String(match.location_id) === String(locationId) &&
        match.scheduled_date === matchDate &&
        (match.scheduled_time || "") === (matchTime || "")
      );
    }).length * Number(courtsNeeded || 1);
  }

  function getPlannedCourtsUsed(rowsToInsert, locationId, matchDate, matchTime, courtsNeeded) {
    return rowsToInsert.filter((match) => {
      return (
        String(match.location_id) === String(locationId) &&
        match.scheduled_date === matchDate &&
        (match.scheduled_time || "") === (matchTime || "")
      );
    }).length * Number(courtsNeeded || 1);
  }

  function getRemainingCourts(locationId, matchDate, matchTime, courtsNeeded, rowsToInsert = []) {
    const location = locations.find((loc) => String(loc.id) === String(locationId));
    const totalCourts = Number(location?.number_of_courts || 0);
    const matchingRows = availability.filter((row) => isAvailabilityMatch(row, locationId, matchDate, matchTime));
    const courtsUnavailableCount = matchingRows.reduce(
      (sum, row) => sum + Number(row.courts_unavailable ?? row.courts_available ?? 0),
      0
    );
    const courtsUsed = getCourtsAlreadyUsed(locationId, matchDate, matchTime, courtsNeeded);
    const plannedCourtsUsed = getPlannedCourtsUsed(rowsToInsert, locationId, matchDate, matchTime, courtsNeeded);

    return {
      isBlackout: totalCourts > 0 && courtsUnavailableCount >= totalCourts,
      totalCourts,
      courtsUnavailable: courtsUnavailableCount,
      courtsUsed,
      plannedCourtsUsed,
      remainingCourts: totalCourts - courtsUnavailableCount - courtsUsed - plannedCourtsUsed,
    };
  }

  function isLeagueBlackoutDate(setting, matchDate) {
    return leagueBlackouts.some((blackout) => {
      const sameLeague = blackout.league_id === setting.league_id;
      const sameDivision = !blackout.division_id || blackout.division_id === setting.division_id;
      return sameLeague && sameDivision && blackout.blackout_date === matchDate;
    });
  }

  async function createMatchLinesForGeneratedMatches(createdMatches, divisionId) {
    if (!createdMatches.length) return;

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
      alert("Matches were created, but no teams are configured for this division. Go to Divisions > Configure Teams and generate default teams.");
      return;
    }

    const matchLineRows = [];

    createdMatches.forEach((match) => {
      lineTemplates.forEach((line) => {
        matchLineRows.push({
          match_id: match.id,
          division_line_id: line.id,
          line_number: line.line_number,
          posted_to_dupr: line.posted_to_dupr,
          line_status: "scheduled",
        });
      });
    });

    const { data: createdLines, error: insertError } = await supabase
      .from("match_lines")
      .insert(matchLineRows)
      .select("id, division_line_id");

    if (insertError) {
      alert(insertError.message);
      return;
    }

    const gameRows = [];

    createdLines.forEach((matchLine) => {
      const template = lineTemplates.find((line) => line.id === matchLine.division_line_id);
      const gamesPerTeam = Number(template?.games_per_line || 1);

      for (let i = 1; i <= gamesPerTeam; i++) {
        gameRows.push({
          match_line_id: matchLine.id,
          game_number: i,
          game_status: "scheduled",
        });
      }
    });

    if (gameRows.length > 0) {
      const { error: gameError } = await supabase.from("line_games").insert(gameRows);
      if (gameError) alert(gameError.message);
    }
  }

  async function generateSchedule(setting) {
    if (!setting.league_id || !setting.division_id) {
      alert("This schedule setting must have a league and division.");
      return;
    }

    if (!setting.season_start_date || setting.default_match_day === null || setting.default_match_day === undefined || setting.default_match_day === "") {
      alert("This schedule setting must have a season start date and default match day.");
      return;
    }

    if (!setting.default_match_time) {
      alert("This schedule setting must have a default match time.");
      return;
    }

    const courtsNeeded = Number(setting.courts_needed_per_match || 1);

    const { data: divisionTeams, error: teamError } = await supabase
      .from("teams")
      .select("id, name, home_location_id, locations(id, name)")
      .eq("division_id", setting.division_id)
      .order("name", { ascending: true });

    if (teamError) return alert(teamError.message);
    if (!divisionTeams || divisionTeams.length < 2) {
      alert("This division needs at least 2 teams before a schedule can be generated.");
      return;
    }

    const existingDivisionMatches = matches.filter((match) => {
      return (
        match.league_id === setting.league_id &&
        match.division_id === setting.division_id &&
        (!setting.season_start_date || match.scheduled_date >= setting.season_start_date) &&
        (!setting.season_end_date || match.scheduled_date <= setting.season_end_date)
      );
    });

    if (existingDivisionMatches.length > 0) {
      const ok = confirm(
        `This league/division already has ${existingDivisionMatches.length} match(es) in this season window.\n\nGenerate additional matches anyway?`
      );
      if (!ok) return;
    }

    const scheduleWeekCount = Number(setting.actual_schedule_weeks || getSeasonWeeks(setting.season_start_date, setting.season_end_date) || 0);

    if (!confirm(`Generate season schedule for ${divisionTeams.length} teams?\n\nActual weeks to schedule: ${scheduleWeekCount || "Full round robin"}\nCourts needed per match: ${courtsNeeded}`)) return;

    setIsGeneratingSchedule(true);

    try {
      const rounds = generateRoundRobin(divisionTeams).slice(0, scheduleWeekCount || undefined);
      const rowsToInsert = [];
      const warnings = [];
      const byeRows = [];

      rounds.forEach((roundGames, roundIndex) => {
        const weekOffset = setting.every_other_week ? roundIndex * 2 : roundIndex;

        let matchDate;
        let adjustedWeekOffset = weekOffset;
        let blackoutSkips = 0;

        while (true) {
          matchDate = getNextDateForDay(
            setting.season_start_date,
            setting.default_match_day,
            adjustedWeekOffset
          );

          if (setting.season_end_date && matchDate > setting.season_end_date) {
            warnings.push(`Round ${roundIndex + 1} falls after the season end date.`);
            return;
          }

          if (!isLeagueBlackoutDate(setting, matchDate)) break;

          warnings.push(`Round ${roundIndex + 1} moved from ${matchDate} because of a league blackout.`);

          blackoutSkips += 1;
          adjustedWeekOffset += setting.every_other_week ? 2 : 1;

          if (blackoutSkips > 10) {
            warnings.push(`Round ${roundIndex + 1} could not be scheduled because too many blackout dates were encountered.`);
            return;
          }
        }

        roundGames.forEach((game) => {
          const homeTeam = divisionTeams.find((team) => team.id === game.home_team_id);
          const awayTeam = divisionTeams.find((team) => team.id === game.away_team_id);
          const homeLocationId = homeTeam?.home_location_id;
          const awayLocationId = awayTeam?.home_location_id;

          if (game.is_bye) {
            const realTeamId = game.home_team_id === "BYE" ? game.away_team_id : game.home_team_id;

            if (setting.allow_byes !== false) {
              byeRows.push({
                league_id: setting.league_id,
                division_id: setting.division_id,
                team_id: realTeamId,
                week_number: roundIndex + 1,
                bye_date: matchDate,
                updated_at: new Date().toISOString(),
              });
            }

            return;
          }

          if (!homeLocationId) {
            warnings.push(`${homeTeam?.name || "Unknown Team"} has no home location.`);
            return;
          }

          let finalHomeTeamId = game.home_team_id;
          let finalAwayTeamId = game.away_team_id;
          let finalLocationId = homeLocationId;

          const homeCourtCheck = getRemainingCourts(homeLocationId, matchDate, setting.default_match_time, courtsNeeded, rowsToInsert);

          if (homeCourtCheck.remainingCourts < courtsNeeded && homeCourtCheck.isBlackout) {
            if (!awayLocationId) {
              warnings.push(`${awayTeam?.name || "Away Team"} has no home location for possible swap.`);
              return;
            }

            const awayCourtCheck = getRemainingCourts(awayLocationId, matchDate, setting.default_match_time, courtsNeeded, rowsToInsert);

            if (awayCourtCheck.remainingCourts >= courtsNeeded) {
              finalHomeTeamId = game.away_team_id;
              finalAwayTeamId = game.home_team_id;
              finalLocationId = awayLocationId;
            } else {
              warnings.push(`${homeTeam?.name || "Home team"} and ${awayTeam?.name || "away team"} do not have enough courts on ${matchDate}.`);
              return;
            }
          } else if (homeCourtCheck.remainingCourts < courtsNeeded) {
            warnings.push(`${homeTeam?.name || "Home team"} vs ${awayTeam?.name || "away team"} overbooks ${homeTeam?.locations?.name || "the home location"} on ${matchDate}. Review this in Schedule Editor.`);
          }

          rowsToInsert.push({
            league_id: setting.league_id,
            division_id: setting.division_id,
            home_team_id: finalHomeTeamId,
            away_team_id: finalAwayTeamId,
            location_id: finalLocationId,
            scheduled_date: matchDate,
            scheduled_time: setting.default_match_time || null,
            week_number: roundIndex + 1,
            notes: `Generated from schedule setting: ${setting.name || "Unnamed Schedule"}`,
            status: "scheduled",
            updated_at: new Date().toISOString(),
          });
        });
      });

      if (rowsToInsert.length === 0) {
        const formattedWarnings = warnings.length
          ? warnings.slice(0, 20).map((warning, index) => `${index + 1}. ${warning}`).join("\n\n")
          : "No specific warning details were returned.";

        alert(`No matches were generated.\n\nIssues Found:\n\n${formattedWarnings}`);
        return;
      }

      const { data: createdMatches, error } = await supabase
        .from("matches")
        .insert(rowsToInsert)
        .select();

      if (error) return alert(error.message);

      if (byeRows.length > 0) {
        const { error: byeError } = await supabase.from("team_byes").insert(byeRows);

        if (byeError) {
          alert(byeError.message);
          return;
        }
      }

      await createMatchLinesForGeneratedMatches(createdMatches || [], setting.division_id);
      await loadData();

      let message = `Generated ${createdMatches?.length || 0} match(es).`;

      if (warnings.length > 0) {
        const formattedWarnings = warnings
          .slice(0, 20)
          .map((warning, index) => `${index + 1}. ${warning}`)
          .join("\n\n");

        message += `\n\nSkipped / Warning Items:\n\n${formattedWarnings}`;

        if (warnings.length > 20) {
          message += `\n\n...and ${warnings.length - 20} more warning item(s).`;
        }
      }

      alert(message);
    } finally {
      setIsGeneratingSchedule(false);
    }
  }

  async function deleteGeneratedSchedule(setting) {
    if (!setting.league_id || !setting.division_id) {
      alert("This schedule setting must have a league and division.");
      return;
    }

    if (!confirmDeleteAction({
      title: `Delete all scheduled matches for ${setting.name || "Unnamed Schedule"}?`,
      details: "This will find matches for this league/division/season window and then ask for final confirmation after counting them. It will delete matches, match lines, game score rows, and related bye rows.",
    })) return;

    let query = supabase
      .from("matches")
      .select("id")
      .eq("league_id", setting.league_id)
      .eq("division_id", setting.division_id);

    if (setting.season_start_date) query = query.gte("scheduled_date", setting.season_start_date);
    if (setting.season_end_date) query = query.lte("scheduled_date", setting.season_end_date);

    const { data: matchesToDelete, error: findError } = await query;
    if (findError) return alert(findError.message);

    const matchIds = (matchesToDelete || []).map((match) => match.id);
    if (matchIds.length === 0) return alert("No matches found for this league/division/season.");

    if (!confirmDeleteAction({
      title: `Delete ${matchIds.length} generated match(es)?`,
      details: "This will delete the selected generated matches, match lines, game score rows, and related bye rows. Entered players, scores, verification status, and standings impact for those matches will be lost.",
    })) return;

    const { data: linesToDelete, error: findLineError } = await supabase
      .from("match_lines")
      .select("id")
      .in("match_id", matchIds);

    if (findLineError) return alert(findLineError.message);

    const lineIds = (linesToDelete || []).map((line) => line.id);

    if (lineIds.length > 0) {
      const { error: gameError } = await supabase.from("line_games").delete().in("match_line_id", lineIds);
      if (gameError) return alert(gameError.message);
    }

    const { error: lineError } = await supabase.from("match_lines").delete().in("match_id", matchIds);
    if (lineError) return alert(lineError.message);

    const { error: matchError } = await supabase.from("matches").delete().in("id", matchIds);
    if (matchError) return alert(matchError.message);

    await supabase
      .from("team_byes")
      .delete()
      .eq("league_id", setting.league_id)
      .eq("division_id", setting.division_id);

    await loadData();
    alert(`Deleted ${matchIds.length} match(es).`);
  }

  const sectionCards = [
    {
      id: "settings",
      title: "Schedule Settings",
      description: "Season dates, match day/time, courts, frequency, byes, and schedule generation.",
      count: settings.length,
    },
    {
      id: "courts",
      title: "Court Unavailability",
      description: "Block courts by location, date, day, and time.",
      count: availability.length,
    },
    {
      id: "blackouts",
      title: "League Blackout Dates",
      description: "Holidays and no-play dates for a league or division.",
      count: leagueBlackouts.length,
    },
  ];

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-7xl">
        <AppHeader
          title="Scheduling"
          subtitle="Manage schedule settings, court unavailability, league blackout dates, and generated season schedules."
        />

        <section className="mt-6 rounded-2xl bg-white p-5 shadow">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            {sectionCards.map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => setActiveSection(section.id)}
                className={`rounded-2xl border p-5 text-left transition ${
                  activeSection === section.id
                    ? "border-blue-600 bg-blue-50 shadow-sm"
                    : "border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-lg font-bold text-slate-900">{section.title}</div>
                    <div className="mt-1 text-sm leading-5 text-slate-600">{section.description}</div>
                  </div>
                  <div className={`rounded-xl px-3 py-2 text-center ${activeSection === section.id ? "bg-blue-700 text-white" : "bg-slate-100 text-slate-800"}`}>
                    <div className="text-xs font-semibold uppercase tracking-wide opacity-80">Saved</div>
                    <div className="text-xl font-bold">{section.count}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>

        {activeSection === "settings" && (
          <section className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[420px_1fr]">
            <FormCard title={editingSettingId ? "Edit Schedule Setting" : "Add Schedule Setting"} subtitle="Create the dates, time, court usage, and frequency used to generate a season schedule. Match format comes from the Division setup.">
              <form onSubmit={saveScheduleSettings} className="space-y-4">
                <div>
                  <FieldLabel label="Setting Name" />
                  <input value={settingName} onChange={(e) => setSettingName(e.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-3" placeholder="Spring 2026 Tuesday League" />
                </div>

                <div>
                  <FieldLabel label="League" />
                  <select value={selectedLeague} onChange={(e) => { setSelectedLeague(e.target.value); setSelectedDivision(""); }} className="w-full rounded-xl border border-slate-300 px-4 py-3">
                    <option value="">Select League</option>
                    {leagues.map((league) => <option key={league.id} value={league.id}>{league.name}</option>)}
                  </select>
                </div>

                <div>
                  <FieldLabel label="Division" />
                  <select value={selectedDivision} onChange={(e) => setSelectedDivision(e.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-3" disabled={!selectedLeague}>
                    <option value="">Select Division</option>
                    {filteredDivisions.map((division) => <option key={division.id} value={division.id}>{division.name}</option>)}
                  </select>
                  <p className="mt-2 text-xs text-slate-500">
                    Teams, games per team, game format, and picklebreaker rules are controlled in Divisions.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div>
                    <FieldLabel label="Season Start" />
                    <input
                      type="date"
                      value={seasonStart}
                      onChange={(e) => {
                        setSeasonStart(e.target.value);
                        setActualScheduleWeeks("");
                      }}
                      className="w-full rounded-xl border border-slate-300 px-4 py-3"
                    />
                  </div>
                  <div>
                    <FieldLabel label="Season End" />
                    <input
                      type="date"
                      value={seasonEnd}
                      onChange={(e) => {
                        setSeasonEnd(e.target.value);
                        setActualScheduleWeeks("");
                      }}
                      className="w-full rounded-xl border border-slate-300 px-4 py-3"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="rounded-xl bg-slate-50 p-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Season Length</div>
                    <div className="mt-1 text-2xl font-bold text-slate-900">{seasonWeeksLabel(seasonStart, seasonEnd)}</div>
                  </div>
                  <div>
                    <FieldLabel label="Actual Weeks To Schedule" />
                    <input
                      type="number"
                      min="1"
                      value={actualScheduleWeeks || Number(getSeasonWeeks(seasonStart, seasonEnd) || "") || ""}
                      onChange={(e) => setActualScheduleWeeks(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-4 py-3"
                    />
                    <p className="mt-2 text-xs text-slate-500">
                      Defaults to Season Length. Override this when blackout weeks should not count as playable weeks.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div>
                    <FieldLabel label="Default Match Day" />
                    <select value={defaultMatchDay} onChange={(e) => setDefaultMatchDay(e.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-3">
                      <option value="">Select Day</option>
                      <option value="0">Sunday</option>
                      <option value="1">Monday</option>
                      <option value="2">Tuesday</option>
                      <option value="3">Wednesday</option>
                      <option value="4">Thursday</option>
                      <option value="5">Friday</option>
                      <option value="6">Saturday</option>
                    </select>
                  </div>
                  <div>
                    <FieldLabel label="Default Match Time" />
                    <input type="time" value={defaultMatchTime} onChange={(e) => setDefaultMatchTime(e.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-3" />
                  </div>
                </div>

                <div>
                  <FieldLabel label="Courts Needed Per Match" />
                  <input type="number" min="1" value={courtsNeededPerMatch} onChange={(e) => setCourtsNeededPerMatch(e.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-3" />
                  <p className="mt-2 text-xs text-slate-500">
                    How many physical courts one full team-vs-team match needs at the scheduled time.
                  </p>
                </div>

                <div className="space-y-2 rounded-xl bg-slate-50 p-4">
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <input type="checkbox" checked={everyOtherWeek} onChange={(e) => setEveryOtherWeek(e.target.checked)} />
                    Schedule Every Other Week
                  </label>
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <input type="checkbox" checked={allowByes} onChange={(e) => setAllowByes(e.target.checked)} />
                    Allow Byes
                  </label>
                </div>

                <div>
                  <FieldLabel label="Notes" />
                  <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-3" placeholder="Scheduling notes..." />
                </div>

                <FormButtons isEditing={!!editingSettingId} submitLabel={editingSettingId ? "Save Schedule Setting" : "Add Schedule Setting"} onCancel={clearSettingsForm} />
              </form>
            </FormCard>

            <ListCard title="Saved Schedule Settings" subtitle="Generate or delete schedules from each saved setting." count={settings.length} emptyText="No schedule settings saved yet.">
              {settings.map((setting) => (
                <RecordCard key={setting.id} title={setting.name || "Unnamed Schedule"}>
                  <DetailGrid>
                    <Detail label="League" value={setting.leagues?.name || ""} />
                    <Detail label="Division" value={setting.divisions?.name || ""} />
                    <Detail label="Season" value={`${setting.season_start_date || ""} - ${setting.season_end_date || ""}`} />
                    <Detail label="Season Length" value={seasonWeeksLabel(setting.season_start_date, setting.season_end_date)} />
                    <Detail label="Actual Weeks" value={setting.actual_schedule_weeks || getSeasonWeeks(setting.season_start_date, setting.season_end_date) || ""} />
                    <Detail label="Match Day" value={dayName(setting.default_match_day)} />
                    <Detail label="Match Time" value={setting.default_match_time || ""} />
                    <Detail label="Frequency" value={setting.every_other_week ? "Every Other Week" : "Weekly"} />
                    <Detail label="Courts Needed" value={setting.courts_needed_per_match || ""} />
                  </DetailGrid>
                  {setting.notes && <NoteBox>{setting.notes}</NoteBox>}
                  <div className="mt-4 flex flex-wrap gap-2">
                    <SmallButton onClick={() => editSetting(setting)}>Edit</SmallButton>
                    <SmallButton color="lightRed" onClick={() => deleteSetting(setting.id)}>Delete Setting</SmallButton>
                    <SmallButton color="green" disabled={isGeneratingSchedule} onClick={() => generateSchedule(setting)}>{isGeneratingSchedule ? "Generating..." : "Generate Schedule"}</SmallButton>
                    <SmallButton color="red" onClick={() => deleteGeneratedSchedule(setting)}>Delete Schedule</SmallButton>
                  </div>
                </RecordCard>
              ))}
            </ListCard>
          </section>
        )}

        {activeSection === "courts" && (
          <section className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[420px_1fr]">
            <FormCard title={editingAvailabilityId ? "Edit Court Unavailability" : "Add Court Unavailability"} subtitle="Block courts by location, weekday, date, and time.">
              <form onSubmit={saveAvailability} className="space-y-4">
                <div>
                  <FieldLabel label="Location" />
                  <select value={availabilityLocation} onChange={(e) => setAvailabilityLocation(e.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-3">
                    <option value="">Select Location</option>
                    {locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
                  </select>
                </div>
                <div>
                  <FieldLabel label="Day of Week" />
                  <select value={dayOfWeek} onChange={(e) => setDayOfWeek(e.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-3">
                    <option value="">Any / Specific Date Only</option>
                    <option value="0">Sunday</option>
                    <option value="1">Monday</option>
                    <option value="2">Tuesday</option>
                    <option value="3">Wednesday</option>
                    <option value="4">Thursday</option>
                    <option value="5">Friday</option>
                    <option value="6">Saturday</option>
                  </select>
                </div>
                <div>
                  <FieldLabel label="Specific Date" />
                  <input type="date" value={specificDate} onChange={(e) => setSpecificDate(e.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-3" />
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div>
                    <FieldLabel label="Start Time" />
                    <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-3" />
                  </div>
                  <div>
                    <FieldLabel label="End Time" />
                    <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-3" />
                  </div>
                </div>
                <div>
                  <FieldLabel label="Courts Not Available" />
                  <input type="number" min="0" value={courtsUnavailable} onChange={(e) => setCourtsUnavailable(e.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-3" />
                </div>
                <div>
                  <FieldLabel label="Notes" />
                  <textarea value={availabilityNotes} onChange={(e) => setAvailabilityNotes(e.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-3" placeholder="Court notes, blackout reason, etc." />
                </div>
                <FormButtons isEditing={!!editingAvailabilityId} submitLabel={editingAvailabilityId ? "Save Court Unavailability" : "Add Court Unavailability"} onCancel={clearAvailabilityForm} />
              </form>
            </FormCard>

            <ListCard title="Saved Court Unavailability" subtitle="These records reduce or block courts when generating schedules." count={availability.length} emptyText="No court unavailability records saved yet.">
              {availability.map((row) => (
                <RecordCard key={row.id} title={row.locations?.name || "Unknown Location"}>
                  <DetailGrid>
                    <Detail label="Day" value={dayName(row.day_of_week)} />
                    <Detail label="Specific Date" value={row.specific_date || ""} />
                    <Detail label="Time" value={`${row.start_time || ""} - ${row.end_time || ""}`} />
                    <Detail label="Courts Not Available" value={row.courts_unavailable ?? row.courts_available ?? ""} />
                  </DetailGrid>
                  {row.notes && <NoteBox>{row.notes}</NoteBox>}
                  <div className="mt-4 flex flex-wrap gap-2">
                    <SmallButton onClick={() => editAvailability(row)}>Edit</SmallButton>
                    <SmallButton color="lightRed" onClick={() => deleteAvailability(row.id)}>Delete</SmallButton>
                  </div>
                </RecordCard>
              ))}
            </ListCard>
          </section>
        )}

        {activeSection === "blackouts" && (
          <section className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[420px_1fr]">
            <FormCard title={editingLeagueBlackoutId ? "Edit League Blackout" : "Add League Blackout"} subtitle="Block league play for holidays or club-wide no-play dates.">
              <form onSubmit={saveLeagueBlackout} className="space-y-4">
                <div>
                  <FieldLabel label="League" />
                  <select value={blackoutLeague} onChange={(e) => { setBlackoutLeague(e.target.value); setBlackoutDivision(""); }} className="w-full rounded-xl border border-slate-300 px-4 py-3">
                    <option value="">Select League</option>
                    {leagues.map((league) => <option key={league.id} value={league.id}>{league.name}</option>)}
                  </select>
                </div>
                <div>
                  <FieldLabel label="Division Optional" />
                  <select value={blackoutDivision} onChange={(e) => setBlackoutDivision(e.target.value)} disabled={!blackoutLeague} className="w-full rounded-xl border border-slate-300 px-4 py-3">
                    <option value="">All Divisions In League</option>
                    {filteredBlackoutDivisions.map((division) => <option key={division.id} value={division.id}>{division.name}</option>)}
                  </select>
                </div>
                <div>
                  <FieldLabel label="Blackout Date" />
                  <input type="date" value={blackoutDate} onChange={(e) => setBlackoutDate(e.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-3" />
                </div>
                <div>
                  <FieldLabel label="Reason" />
                  <input value={blackoutReason} onChange={(e) => setBlackoutReason(e.target.value)} placeholder="Holiday, club event, no league play, etc." className="w-full rounded-xl border border-slate-300 px-4 py-3" />
                </div>
                <FormButtons isEditing={!!editingLeagueBlackoutId} submitLabel={editingLeagueBlackoutId ? "Save League Blackout" : "Add League Blackout"} onCancel={clearLeagueBlackoutForm} />
              </form>
            </FormCard>

            <ListCard title="Saved League Blackout Dates" subtitle="These dates are skipped during schedule generation." count={leagueBlackouts.length} emptyText="No league blackout dates saved yet.">
              {leagueBlackouts.map((row) => (
                <RecordCard key={row.id} title={row.blackout_date}>
                  <DetailGrid>
                    <Detail label="League" value={row.leagues?.name || ""} />
                    <Detail label="Division" value={row.divisions?.name || "All Divisions"} />
                    <Detail label="Reason" value={row.reason || ""} />
                  </DetailGrid>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <SmallButton onClick={() => editLeagueBlackout(row)}>Edit</SmallButton>
                    <SmallButton color="lightRed" onClick={() => deleteLeagueBlackout(row.id)}>Delete</SmallButton>
                  </div>
                </RecordCard>
              ))}
            </ListCard>
          </section>
        )}
      </div>
    </main>
  );
}

function FormCard({ title, subtitle, children }) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow">
      <h2 className="text-xl font-bold text-slate-900">{title}</h2>
      <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function ListCard({ title, subtitle, count, emptyText, children }) {
  const hasChildren = Array.isArray(children) ? children.length > 0 : !!children;

  return (
    <div className="rounded-2xl bg-white p-6 shadow">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">{title}</h2>
          <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
        </div>
        <div className="rounded-xl bg-slate-900 px-5 py-3 text-white">
          <div className="text-xs uppercase tracking-wide text-slate-300">Saved</div>
          <div className="text-2xl font-bold">{count}</div>
        </div>
      </div>

      <div className="space-y-3">
        {children}
        {!hasChildren && (
          <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
            {emptyText}
          </div>
        )}
      </div>
    </div>
  );
}

function RecordCard({ title, children }) {
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="text-lg font-bold text-slate-900">{title}</div>
      {children}
    </div>
  );
}

function DetailGrid({ children }) {
  return <div className="mt-2 grid grid-cols-1 gap-x-6 md:grid-cols-2">{children}</div>;
}

function FormButtons({ isEditing, submitLabel, onCancel }) {
  return (
    <div className="flex gap-3">
      <button type="submit" className="flex-1 rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800">
        {submitLabel}
      </button>
      {isEditing && (
        <button type="button" onClick={onCancel} className="rounded-xl bg-slate-200 px-5 py-3 font-semibold hover:bg-slate-300">
          Cancel
        </button>
      )}
    </div>
  );
}

function SmallButton({ color = "dark", disabled = false, onClick, children }) {
  const classes = {
    dark: "bg-slate-900 text-white hover:bg-slate-700",
    green: "bg-green-700 text-white hover:bg-green-800",
    red: "bg-red-700 text-white hover:bg-red-800",
    lightRed: "bg-red-100 text-red-800 hover:bg-red-200",
  };

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-50 ${classes[color] || classes.dark}`}
    >
      {children}
    </button>
  );
}

function FieldLabel({ label }) {
  return (
    <label className="mb-1 block text-sm font-semibold text-slate-700">
      {label}
    </label>
  );
}

function Detail({ label, value }) {
  return (
    <div className="mt-1 text-sm text-slate-600">
      <span className="font-semibold text-slate-800">{label}:</span> {value}
    </div>
  );
}

function NoteBox({ children }) {
  return (
    <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
      {children}
    </div>
  );
}

