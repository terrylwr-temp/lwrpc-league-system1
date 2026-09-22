import test from "node:test";
import assert from "node:assert/strict";
import { copyScheduleSettingPayload, scheduleSettingMatches } from "../app/lib/scheduleSettingsCopy.js";

const source = {
  id: "source", league_id: "league", division_id: "division", name: "Fall League",
  season_start_date: "2026-10-01", season_end_date: "2026-12-01",
  default_match_day: "thursday", default_match_time: "18:00:00",
  courts_needed_per_match: 4, actual_schedule_weeks: 7, every_other_week: true,
  allow_byes: false, notes: "Avoid holidays", matches_per_team: 7,
  lines_playing: 3, games_per_line: 2, schedule_status: "generated",
  created_at: "2026-01-01", updated_at: "2026-02-01",
};

test("copy preserves only setting fields and gets an independent name and status", () => {
  const copy = copyScheduleSettingPayload(source, [source, { ...source, name: "Fall League (Copy)" }]);
  assert.equal(copy.name, "Fall League (Copy) 2");
  assert.equal(copy.league_id, source.league_id);
  assert.equal(copy.division_id, source.division_id);
  assert.equal(copy.default_match_time, source.default_match_time);
  assert.equal(copy.actual_schedule_weeks, source.actual_schedule_weeks);
  assert.equal(copy.allow_byes, source.allow_byes);
  assert.equal(copy.schedule_status, "draft");
  assert.equal(copy.is_copy, true);
  assert.equal(copy.id, undefined);
  assert.equal(copy.created_at, undefined);
  assert.equal(copy.updated_at, undefined);
  assert.equal(copy.schedule_setting_id, undefined);
});

test("copied status counts only matches generated from the copy", () => {
  const copy = { ...source, id: "copy", schedule_status: "draft", is_copy: true };
  const matches = [
    { league_id: "league", division_id: "division", scheduled_date: "2026-10-08", schedule_setting_id: null },
    { league_id: "league", division_id: "division", scheduled_date: "2026-10-15", schedule_setting_id: "source" },
    { league_id: "league", division_id: "division", scheduled_date: "2026-10-22", schedule_setting_id: "copy" },
    { league_id: "league", division_id: "division", scheduled_date: "2027-01-01", schedule_setting_id: "copy" },
  ];
  assert.deepEqual(scheduleSettingMatches(copy, matches), [matches[2]]);
  assert.deepEqual(scheduleSettingMatches(source, matches), [matches[0], matches[1]]);
  assert.deepEqual(scheduleSettingMatches(copy, matches.slice(0, 2)), []);
});
