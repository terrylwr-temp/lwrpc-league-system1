import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildEndOfSeasonPointsPreview, roundCompensatoryPoints } from "../app/lib/compensatoryPoints.js";

test("DUPR Rules Rule 6.3.9 rounds the total compensation once using half-up whole-number rounding", () => {
  assert.equal(roundCompensatoryPoints(6.49), 6);
  assert.equal(roundCompensatoryPoints(6.5), 7);
});

test("end-of-season points compare each team's verified match dates with the Division maximum", () => {
  const preview = buildEndOfSeasonPointsPreview({
    teams: [
      { id: "a", name: "A" },
      { id: "b", name: "B" },
      { id: "c", name: "C" },
    ],
    matches: [
      { id: "m1", home_team_id: "a", away_team_id: "b", scheduled_date: "2026-01-01", status: "completed", score_status: "verified" },
      { id: "m2", home_team_id: "a", away_team_id: "c", scheduled_date: "2026-01-08", status: "completed", score_status: "verified" },
      { id: "m3", home_team_id: "b", away_team_id: "c", scheduled_date: "2026-01-15", status: "completed", score_status: "verified" },
      { id: "m4", home_team_id: "b", away_team_id: "c", scheduled_date: "2026-01-22", status: "completed", score_status: "verified" },
    ],
    standings: [
      { team_id: "a", matches_played: 2, standings_points: 7 },
      { team_id: "b", matches_played: 3, standings_points: 12 },
      { team_id: "c", matches_played: 3, standings_points: 9 },
    ],
    awards: [],
  });

  assert.equal(preview.readyToApply, true);
  assert.equal(preview.maximumMatchDatesPlayed, 3);
  assert.equal(preview.rows[0].matchDatesPlayed, 2);
  assert.equal(preview.rows[0].missingMatchDates, 1);
  assert.equal(preview.rows[0].averagePoints, 3.5);
  assert.equal(preview.rows[0].compensatoryPoints, 4);
  assert.equal(preview.rows[0].finalPoints, 11);
  assert.equal(preview.rows[1].compensatoryPoints, 0);
});

test("same-day doubleheaders count as one played date while both verified matches validate standings", () => {
  const preview = buildEndOfSeasonPointsPreview({
    teams: [
      { id: "a", name: "A" },
      { id: "b", name: "B" },
      { id: "c", name: "C" },
    ],
    matches: [
      { id: "m1", home_team_id: "a", away_team_id: "b", scheduled_date: "2026-01-01", status: "completed", score_status: "verified" },
      { id: "m2", home_team_id: "a", away_team_id: "c", scheduled_date: "2026-01-01", status: "completed", score_status: "verified" },
      { id: "m3", home_team_id: "b", away_team_id: "c", scheduled_date: "2026-01-08", status: "completed", score_status: "verified" },
    ],
    standings: [
      { team_id: "a", matches_played: 2, standings_points: 9 },
      { team_id: "b", matches_played: 2, standings_points: 8 },
      { team_id: "c", matches_played: 2, standings_points: 7 },
    ],
    awards: [],
  });

  assert.equal(preview.readyToApply, true);
  assert.equal(preview.rows[0].verifiedMatchCount, 2);
  assert.equal(preview.rows[0].matchDatesPlayed, 1);
  assert.equal(preview.rows[0].missingMatchDates, 1);
  assert.equal(preview.rows[0].compensatoryPoints, 9);
});

test("finalization blocks unfinished matches, missing dates, and standings mismatches", () => {
  const unfinished = buildEndOfSeasonPointsPreview({
    teams: [{ id: "a", name: "A" }, { id: "b", name: "B" }],
    matches: [{ id: "m1", home_team_id: "a", away_team_id: "b", scheduled_date: "2026-01-01", status: "scheduled", score_status: "not_entered" }],
    standings: [],
    awards: [],
  });
  assert.equal(unfinished.readyToApply, false);
  assert.equal(unfinished.unresolvedMatches.length, 1);

  const missingDate = buildEndOfSeasonPointsPreview({
    teams: [{ id: "a", name: "A" }, { id: "b", name: "B" }],
    matches: [{ id: "m1", home_team_id: "a", away_team_id: "b", scheduled_date: null, status: "completed", score_status: "verified" }],
    standings: [{ team_id: "a", matches_played: 1 }, { team_id: "b", matches_played: 1 }],
    awards: [],
  });
  assert.equal(missingDate.readyToApply, false);
  assert.match(missingDate.unresolvedMatches[0].reason, /missing its scheduled date/);

  const mismatch = buildEndOfSeasonPointsPreview({
    teams: [{ id: "a", name: "A" }, { id: "b", name: "B" }],
    matches: [{ id: "m1", home_team_id: "a", away_team_id: "b", scheduled_date: "2026-01-01", status: "completed", score_status: "verified" }],
    standings: [{ team_id: "a", matches_played: 0 }, { team_id: "b", matches_played: 1 }],
    awards: [],
  });
  assert.equal(mismatch.readyToApply, false);
  assert.match(mismatch.rows[0].validationError, /do not match/);
});

test("the additive migrations and standings integration preserve the audited security contract", () => {
  const initialMigration = readFileSync(new URL("../supabase/migrations/20260918012928_rule_5_15_1_compensatory_points.sql", import.meta.url), "utf8");
  const endOnlyMigration = readFileSync(new URL("../supabase/migrations/20260918114101_end_of_season_played_date_points.sql", import.meta.url), "utf8");
  const rebuild = readFileSync(new URL("../app/lib/standingsRebuild.js", import.meta.url), "utf8");
  const route = readFileSync(new URL("../app/api/standings-compensation/route.js", import.meta.url), "utf8");

  assert.match(initialMigration, /division_compensation_baselines enable row level security/);
  assert.match(initialMigration, /revoke all on table public\.division_compensation_baselines from anon, authenticated/);
  assert.match(initialMigration, /grant all on table public\.division_compensation_baselines to service_role/);
  assert.match(endOnlyMigration, /alter column baseline_id drop not null/);
  assert.match(endOnlyMigration, /calculation_basis text not null default 'starting_schedule'/);
  assert.match(endOnlyMigration, /foreign key \(division_id\) references public\.divisions\(id\) on delete cascade/);
  assert.match(endOnlyMigration, /foreign key \(team_id\) references public\.teams\(id\) on delete cascade/);
  assert.match(route, /authorizeAdminRequest\(req, "league_manager"\)/);
  assert.match(route, /body\.confirmation !== "FINALIZE"/);
  assert.match(route, /calculation_basis: "verified_match_dates"/);
  assert.match(route, /buildEndOfSeasonPointsPreview/);
  assert.doesNotMatch(route, /action === "capture"|CAPTURE|baselineMissing/);
  assert.match(rebuild, /division_compensatory_point_awards/);
  assert.doesNotMatch(rebuild, /applyFinalByeAdjustments|publishedScheduleIsFullyVerified/);
});

test("League Standings is grouped under Match Operations and exposes End of Season Points", () => {
  const navigation = readFileSync(new URL("../app/lib/adminNavigation.js", import.meta.url), "utf8");
  const standingsPage = readFileSync(new URL("../app/standings/page.js", import.meta.url), "utf8");

  assert.match(navigation, /key: "matches"[\s\S]*title: "League Standings"[\s\S]*DUPR Rules, Rule 6\.3\.9/);
  assert.match(standingsPage, />\s*End of Season Points\s*</);
  assert.match(standingsPage, /DUPR Rules · Rule 6\.3\.9/);
  assert.match(standingsPage, /Match Dates Played/);
  assert.doesNotMatch(standingsPage, /Capture Starting Schedule|onCapture|baselineMissing/);
});
