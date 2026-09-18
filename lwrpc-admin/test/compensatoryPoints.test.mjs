import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildCompensatoryPointsPreview, roundCompensatoryPoints } from "../app/lib/compensatoryPoints.js";

test("Rule 5.15.1 rounds the total compensation once using half-up whole-number rounding", () => {
  assert.equal(roundCompensatoryPoints(6.49), 6);
  assert.equal(roundCompensatoryPoints(6.5), 7);
});

test("Rule 5.15.1 compares starting match dates and excludes cancelled matches from the average", () => {
  const preview = buildCompensatoryPointsPreview({
    baseline: { max_scheduled_match_dates: 10 },
    baselineTeams: [
      { team_id: "a", team_name: "A", scheduled_match_dates: 8 },
      { team_id: "b", team_name: "B", scheduled_match_dates: 10 },
    ],
    baselineMatches: [
      { match_id: "m1", home_team_id: "a", away_team_id: "b", scheduled_date: "2026-01-01" },
      { match_id: "m2", home_team_id: "a", away_team_id: "b", scheduled_date: "2026-01-08" },
      { match_id: "m3", home_team_id: "a", away_team_id: "b", scheduled_date: "2026-01-15" },
    ],
    currentMatches: [
      { id: "m1", status: "completed", score_status: "verified" },
      { id: "m2", status: "completed", score_status: "verified" },
      { id: "m3", status: "cancelled", score_status: "not_entered" },
    ],
    standings: [
      { team_id: "a", matches_played: 2, standings_points: 7 },
      { team_id: "b", matches_played: 2, standings_points: 9 },
    ],
    awards: [],
  });

  assert.equal(preview.readyToApply, true);
  assert.equal(preview.rows[0].missingMatchDates, 2);
  assert.equal(preview.rows[0].averagePoints, 3.5);
  assert.equal(preview.rows[0].compensatoryPoints, 7);
  assert.equal(preview.rows[0].finalPoints, 14);
  assert.equal(preview.rows[1].compensatoryPoints, 0);
});

test("same-day doubleheaders count as one qualifying match date while validating both matches", () => {
  const preview = buildCompensatoryPointsPreview({
    baseline: { max_scheduled_match_dates: 2 },
    baselineTeams: [{ team_id: "a", team_name: "A", scheduled_match_dates: 1 }],
    baselineMatches: [
      { match_id: "m1", home_team_id: "a", away_team_id: "b", scheduled_date: "2026-01-01" },
      { match_id: "m2", home_team_id: "a", away_team_id: "c", scheduled_date: "2026-01-01" },
    ],
    currentMatches: [
      { id: "m1", status: "completed", score_status: "verified" },
      { id: "m2", status: "completed", score_status: "verified" },
    ],
    standings: [{ team_id: "a", matches_played: 2, standings_points: 9 }],
    awards: [],
  });

  assert.equal(preview.readyToApply, true);
  assert.equal(preview.rows[0].verifiedMatchCount, 2);
  assert.equal(preview.rows[0].qualifyingMatchDates, 1);
  assert.equal(preview.rows[0].compensatoryPoints, 9);
});

test("finalization blocks unresolved or standings-mismatched starting-schedule matches", () => {
  const preview = buildCompensatoryPointsPreview({
    baseline: { max_scheduled_match_dates: 1 },
    baselineTeams: [{ team_id: "a", team_name: "A", scheduled_match_dates: 1 }],
    baselineMatches: [{ match_id: "missing", home_team_id: "a", away_team_id: "b", scheduled_date: "2026-01-01" }],
    currentMatches: [],
    standings: [{ team_id: "a", matches_played: 1, standings_points: 4 }],
    awards: [],
  });
  assert.equal(preview.readyToApply, false);
  assert.equal(preview.unresolvedMatches.length, 1);
  assert.match(preview.rows[0].validationError, /do not match/);
});

test("Rule 5.15.1 migration and standings integration preserve the audited security contract", () => {
  const migration = readFileSync(new URL("../supabase/migrations/20260918012928_rule_5_15_1_compensatory_points.sql", import.meta.url), "utf8");
  const rebuild = readFileSync(new URL("../app/lib/standingsRebuild.js", import.meta.url), "utf8");
  const route = readFileSync(new URL("../app/api/standings-compensation/route.js", import.meta.url), "utf8");

  assert.match(migration, /division_compensation_baselines enable row level security/);
  assert.match(migration, /revoke all on table public\.division_compensation_baselines from anon, authenticated/);
  assert.match(migration, /grant all on table public\.division_compensation_baselines to service_role/);
  assert.match(migration, /max_scheduled_match_dates integer not null/);
  assert.match(migration, /verified_match_count integer not null/);
  assert.match(route, /authorizeAdminRequest\(req, "league_manager"\)/);
  assert.match(route, /body\.confirmation !== "FINALIZE"/);
  assert.match(route, /COMPENSATORY_POINTS_CALCULATION_VERSION/);
  assert.match(rebuild, /division_compensatory_point_awards/);
  assert.doesNotMatch(rebuild, /applyFinalByeAdjustments|publishedScheduleIsFullyVerified/);
});
