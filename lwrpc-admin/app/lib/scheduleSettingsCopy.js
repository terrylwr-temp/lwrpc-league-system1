export function scheduleSettingMatches(setting, matches) {
  return matches.filter((match) => {
    if (match.league_id !== setting.league_id || match.division_id !== setting.division_id) return false;
    if (setting.season_start_date && !(match.scheduled_date >= setting.season_start_date)) return false;
    if (setting.season_end_date && !(match.scheduled_date <= setting.season_end_date)) return false;

    // Older matches have no setting ID. Copies only own matches generated from that copy.
    return match.schedule_setting_id === setting.id ||
      (!setting.is_copy && !match.schedule_setting_id);
  });
}

export function copyScheduleSettingPayload(setting, settings) {
  const baseName = `${setting.name || "Unnamed Schedule"} (Copy)`;
  const names = new Set(settings
    .filter((row) => row.league_id === setting.league_id && row.division_id === setting.division_id)
    .map((row) => row.name));
  let name = baseName;
  for (let number = 2; names.has(name); number += 1) name = `${baseName} ${number}`;

  return {
    league_id: setting.league_id,
    division_id: setting.division_id,
    name,
    season_start_date: setting.season_start_date,
    season_end_date: setting.season_end_date,
    default_match_day: setting.default_match_day,
    default_match_time: setting.default_match_time,
    matches_per_team: setting.matches_per_team,
    allow_byes: setting.allow_byes,
    notes: setting.notes,
    courts_needed_per_match: setting.courts_needed_per_match,
    lines_playing: setting.lines_playing,
    games_per_line: setting.games_per_line,
    every_other_week: setting.every_other_week,
    actual_schedule_weeks: setting.actual_schedule_weeks,
    schedule_status: "draft",
    is_copy: true,
  };
}
