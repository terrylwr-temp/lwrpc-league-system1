import { scheduleLeagueRounds } from "./leagueSchedulePairings.js";

export function generateLeagueScheduleDraft(input) {
  const evaluate = (rounds) => buildLeagueScheduleDraft({ ...input, rounds }).hardCosts;
  const rounds = scheduleLeagueRounds(input.teams, input.weekCount, { evaluate });
  return buildLeagueScheduleDraft({ ...input, rounds });
}

// Pure projection of the accepted date, court, warning and bye behavior.
// Candidate evaluation never inserts matches, byes, lines or games.
export function buildLeagueScheduleDraft({
  teams, setting, rounds, locations = [], availability = [], matches = [], leagueBlackouts = [],
}) {
  const courtsNeeded = Number(setting.courts_needed_per_match || 1);
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
      const sameLeague = !blackout.league_id || blackout.league_id === setting.league_id;
      const sameDivision = !blackout.division_id || blackout.division_id === setting.division_id;
      return sameLeague && sameDivision && blackout.blackout_date === matchDate;
    });
  }


  const rowsToInsert = [];
  const warnings = [];
  const byeRows = [];
  let courtWarnings = 0;
  let nextWeekOffset = 0;

  rounds.forEach((roundGames, roundIndex) => {
    let matchDate;
    let adjustedWeekOffset = nextWeekOffset;
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

    nextWeekOffset = adjustedWeekOffset + (setting.every_other_week ? 2 : 1);

    roundGames.forEach((game) => {
      const homeTeam = teams.find((team) => team.id === game.home_team_id);
      const awayTeam = teams.find((team) => team.id === game.away_team_id);
      const homeLocationId = homeTeam?.home_location_id;
      const awayLocationId = awayTeam?.home_location_id;

      if (game.is_bye) {
        const realTeamId = game.home_team_id === "BYE" ? game.away_team_id : game.home_team_id;

        if (setting.allow_byes !== false) {
          byeRows.push({
            league_id: setting.league_id,
            division_id: setting.division_id,
            schedule_setting_id: setting.id,
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
        courtWarnings += 1;
        warnings.push(`${homeTeam?.name || "Home team"} vs ${awayTeam?.name || "away team"} overbooks ${homeTeam?.locations?.name || "the home location"} on ${matchDate}. Review this in Schedule Editor.`);
      }

      rowsToInsert.push({
        league_id: setting.league_id,
        division_id: setting.division_id,
        schedule_setting_id: setting.id,
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


  const expectedMatches = rounds.flat().filter((game) => !game.is_bye).length;
  const expectedByes = setting.allow_byes === false ? 0 : rounds.flat().filter((game) => game.is_bye).length;
  const hardCosts = [
    expectedMatches - rowsToInsert.length + expectedByes - byeRows.length,
    courtWarnings,
  ];
  return { rowsToInsert, byeRows, warnings, hardCosts, rounds };
}
