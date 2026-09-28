import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { buildLeagueScheduleDraft, generateLeagueScheduleDraft } from "../app/lib/leagueScheduleGeneration.js";
import { countSameLocationMatchups, generateLeagueRoundRobin, scheduleLeagueRounds } from "../app/lib/leagueSchedulePairings.js";

function fixture(groups, weeks = 8) {
  return {
    teams: groups.flatMap((size, location) => Array.from({ length: size }, (_, index) => ({
      id: `team-${location}-${index}`, name: `Team ${location}/${index}`,
      home_location_id: `location-${location}`, locations: { id: `location-${location}`, name: "Shared display name" },
    }))),
    locations: groups.map((_, location) => ({ id: `location-${location}`, number_of_courts: 48 })),
    setting: {
      id: "setting", league_id: "league", division_id: "division", name: "Fall",
      season_start_date: "2026-10-01", season_end_date: "2027-06-01",
      default_match_day: "thursday", default_match_time: "18:00:00", courts_needed_per_match: 4,
      allow_byes: true,
    },
    weekCount: weeks,
  };
}

function verifySchedule(draft, input, expectedSame) {
  assert.equal(draft.rowsToInsert.length, input.weekCount * Math.floor(input.teams.length / 2));
  assert.deepEqual(draft.hardCosts, [0, 0]);
  assert.equal(countSameLocationMatchups(draft.rounds, input.teams), expectedSame);
  const cycleLength = input.teams.length % 2 ? input.teams.length : input.teams.length - 1;
  const teamIds = input.teams.map((team) => team.id).sort();
  for (let start = 0; start < draft.rounds.length; start += cycleLength) {
    const pairs = new Set();
    for (const round of draft.rounds.slice(start, start + cycleLength)) {
      assert.deepEqual(round.flatMap((game) => [game.home_team_id, game.away_team_id]).filter((id) => id !== "BYE").sort(), teamIds);
      for (const game of round) {
        const key = JSON.stringify([game.home_team_id, game.away_team_id].sort());
        assert.ok(!pairs.has(key), `Repeated opponent/bye: ${key}`);
        pairs.add(key);
      }
    }
  }
  const teamLocations = new Map(input.teams.map((team) => [team.id, team.home_location_id]));
  const actualSame = draft.rowsToInsert.filter((match) => teamLocations.get(match.home_team_id) === teamLocations.get(match.away_team_id)).length;
  assert.equal(actualSame, expectedSame, "Persistable match rows must match the optimized pairings");
  assert.ok(draft.rowsToInsert.every((match) => match.location_id === teamLocations.get(match.home_team_id)));
}

test("12 teams, 8 weeks: three four-team locations produce zero same-location matchups", () => {
  const input = fixture([4, 4, 4]);
  assert.ok(countSameLocationMatchups(generateLeagueRoundRobin(input.teams).slice(0, 8), input.teams) > 0,
    "The previous first-valid circle schedule reproduces the defect");
  const before = structuredClone(input);
  verifySchedule(generateLeagueScheduleDraft(input), input, 0);
  assert.deepEqual(input, before, "Candidate evaluation must not mutate supplied business rows");
});

test("zero-location result is stable across reversed and interleaved team input ordering", () => {
  for (const order of ["reversed", "interleaved"]) {
    const input = fixture([4, 4, 4]);
    input.teams = order === "reversed" ? input.teams.reverse() :
      [0, 4, 8, 1, 5, 9, 2, 6, 10, 3, 7, 11].map((index) => input.teams[index]);
    verifySchedule(generateLeagueScheduleDraft(input), input, 0);
  }
});

test("unavoidable same-location opponents remain eligible and reach the proven minimum", () => {
  // Six opposing-location teams cannot fill eight distinct-opponent weeks:
  // each of 12 teams needs at least two local opponents, hence 12 local games.
  const input = fixture([6, 6]);
  verifySchedule(generateLeagueScheduleDraft(input), input, 12);
});

test("unequal location groups and odd deficit parity reach their mathematical minima", () => {
  // 8/4: eight majority teams need four local opponents => at least 16 games.
  // 7/5: ceil(7*3/2) + ceil(5*1/2) = 14 games, including parity per location.
  for (const [groups, minimum] of [[[8, 4], 16], [[7, 5], 14]]) {
    const input = fixture(groups);
    verifySchedule(generateLeagueScheduleDraft(input), input, minimum);
  }
});

test("location identity uses IDs, ignores display names and does not equate unknown locations", () => {
  const round = [[{ home_team_id: "a", away_team_id: "b", is_bye: false }]];
  assert.equal(countSameLocationMatchups(round, [
    { id: "a", home_location_id: 7, locations: { name: "Old label" } },
    { id: "b", home_location_id: "7", locations: { name: "Renamed label" } },
  ]), 1);
  assert.equal(countSameLocationMatchups(round, [
    { id: "a", home_location_id: "a", locations: { name: "Same" } },
    { id: "b", home_location_id: "b", locations: { name: "Same" } },
  ]), 0);
  assert.equal(countSameLocationMatchups(round, [{ id: "a", home_location_id: null }, { id: "b" }]), 0);
});

test("odd divisions preserve one unique bye per cycle and zero local games where possible", () => {
  const input = fixture([3, 2], 3);
  const draft = generateLeagueScheduleDraft(input);
  verifySchedule(draft, input, 0);
  assert.equal(draft.byeRows.length, 3);
  assert.equal(new Set(draft.byeRows.map((row) => row.team_id)).size, 3);
  input.setting.allow_byes = false;
  assert.equal(generateLeagueScheduleDraft(input).byeRows.length, 0);
});

test("full and repeated round-robin cycles retain opponent coverage and reversed hosting", () => {
  const input = fixture([2, 2], 6);
  const draft = generateLeagueScheduleDraft(input);
  verifySchedule(draft, input, 4);
  for (let week = 0; week < 3; week++) {
    assert.deepEqual(draft.rounds[week + 3], draft.rounds[week].map((game) => ({
      ...game, home_team_id: game.away_team_id, away_team_id: game.home_team_id,
    })));
  }
  assert.equal(scheduleLeagueRounds(input.teams, 0).length, 3);
});

test("a single location still generates the complete season", () => {
  const input = fixture([4], 5);
  verifySchedule(generateLeagueScheduleDraft(input), input, 10);
});

test("aggregate court capacity and existing bookings outrank the location preference", () => {
  const input = fixture([4, 4, 4]);
  input.locations.forEach((location) => { location.number_of_courts = 12; });
  input.matches = input.locations.map((location) => ({
    id: `existing-${location.id}`, location_id: location.id,
    scheduled_date: "2026-10-01", scheduled_time: "18:00:00",
  }));
  const draft = generateLeagueScheduleDraft(input);
  verifySchedule(draft, input, 0);
  for (const location of input.locations) {
    assert.equal(draft.rowsToInsert.filter((match) => match.scheduled_date === "2026-10-01" && match.location_id === location.id).length, 2);
  }
});

test("location blackout swaps hosts without changing the optimal opponent count", () => {
  const input = fixture([4, 4, 4]);
  input.availability = [{ location_id: "location-0", specific_date: "2026-10-01", courts_unavailable: 48 }];
  const draft = generateLeagueScheduleDraft(input);
  verifySchedule(draft, input, 0);
  assert.ok(draft.rowsToInsert.filter((match) => match.scheduled_date === "2026-10-01").every((match) => match.location_id !== "location-0"));
});

test("date blackouts and every-other-week cadence retain accepted dates and week numbers", () => {
  const input = fixture([2, 2], 2);
  input.setting.every_other_week = true;
  input.leagueBlackouts = [
    { league_id: null, division_id: null, blackout_date: "2026-10-01" },
    { league_id: "other-league", division_id: null, blackout_date: "2026-10-15" },
  ];
  const draft = generateLeagueScheduleDraft(input);
  verifySchedule(draft, input, 0);
  assert.deepEqual([...new Set(draft.rowsToInsert.map((match) => match.scheduled_date))], ["2026-10-15", "2026-10-29"]);
  assert.deepEqual([...new Set(draft.rowsToInsert.map((match) => match.week_number))], [1, 2]);
  assert.match(draft.warnings[0], /moved from 2026-10-01/);
});

test("hard pairing requirements can require local games and are never relaxed", () => {
  const input = fixture([2, 2], 1);
  const evaluate = (rounds) => [rounds.flat().filter((game) => {
    const home = input.teams.find((team) => team.id === game.home_team_id);
    const away = input.teams.find((team) => team.id === game.away_team_id);
    return home.home_location_id !== away.home_location_id;
  }).length, 0];
  const rounds = scheduleLeagueRounds(input.teams, 1, { evaluate });
  assert.deepEqual(evaluate(rounds), [0, 0]);
  assert.equal(countSameLocationMatchups(rounds, input.teams), 2);
});

test("alternate swaps improve an initial schedule even when the bounded search is disabled", () => {
  const input = fixture([2, 2, 2], 2);
  const initial = generateLeagueRoundRobin(input.teams).slice(0, 2);
  const rounds = scheduleLeagueRounds(input.teams, 2, { searchNodeLimit: 0 });
  assert.ok(countSameLocationMatchups(initial, input.teams) > 0);
  const draft = buildLeagueScheduleDraft({ ...input, rounds });
  verifySchedule(draft, input, 0);
});

test("legacy court warnings, omitted blackout games and season-end warnings remain reviewable", () => {
  const input = fixture([2, 2], 2);
  input.setting.season_end_date = "2026-10-01";
  input.locations.forEach((location) => { location.number_of_courts = 4; });
  input.availability = [{ location_id: "location-0", specific_date: "2026-10-01", courts_unavailable: 2 }];
  let draft = buildLeagueScheduleDraft({ ...input, rounds: generateLeagueRoundRobin(input.teams).slice(0, 2) });
  assert.ok(draft.warnings.some((warning) => warning.includes("overbooks")));
  assert.ok(draft.warnings.some((warning) => warning.includes("after the season end")));
  assert.equal(draft.rowsToInsert.length, 2);
  input.availability = input.locations.map((location) => ({ location_id: location.id, specific_date: "2026-10-01", courts_unavailable: 4 }));
  draft = buildLeagueScheduleDraft({ ...input, rounds: generateLeagueRoundRobin(input.teams).slice(0, 1) });
  assert.equal(draft.rowsToInsert.length, 0);
  assert.ok(draft.warnings.every((warning) => warning.includes("enough courts")));
});

test("Scheduling uses the tested pure generator before the existing persistence flow", () => {
  const page = fs.readFileSync(new URL("../app/scheduling/page.js", import.meta.url), "utf8");
  assert.match(page, /generateLeagueScheduleDraft\(\{\s*teams: divisionTeams, setting, weekCount: scheduleWeekCount,/);
  assert.match(page, /locations, availability, matches, leagueBlackouts/);
  assert.ok(page.indexOf("= generateLeagueScheduleDraft(") < page.indexOf(".insert(rowsToInsert)"));
  assert.match(page, /home_location_id, is_active, locations\(id, name\)/);
  assert.match(page, /requireRole\(router, "league_manager"\)/);
});
