import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  buildSpecialRequestPayload,
  filterAndSortSpecialRequests,
  filterSpecialRequestMembers,
  specialRequestMemberLabel,
  specialRequestTeamsForDivision,
} from "../app/lib/schedulingSpecialRequests.js";

test("Special Request payload validates required fields and preserves optional nulls", () => {
  const payload = buildSpecialRequestPayload({
    memberId: "member-1",
    requestDate: "2026-11-12",
    requestText: "  Please avoid the community courts.  ",
  });

  assert.deepEqual(payload, {
    location_id: null,
    member_id: "member-1",
    request_date: "2026-11-12",
    division_id: null,
    team_id: null,
    request_text: "Please avoid the community courts.",
  });
  assert.throws(() => buildSpecialRequestPayload({ requestDate: "2026-11-12", requestText: "Request" }), /member/i);
  assert.throws(() => buildSpecialRequestPayload({ memberId: "member-1", requestText: "Request" }), /date/i);
  assert.throws(() => buildSpecialRequestPayload({ memberId: "member-1", requestDate: "2026-11-12", requestText: "   " }), /details/i);
});

test("Division selection filters teams and rejects inconsistent relationships", () => {
  const teams = [
    { id: "team-2", name: "Bravo", division_id: "division-2", is_active: true },
    { id: "team-1", name: "Alpha", division_id: "division-1", is_active: true },
    { id: "team-3", name: "Archived", division_id: "division-1", is_active: false },
  ];

  assert.deepEqual(specialRequestTeamsForDivision(teams, "division-1").map((team) => team.id), ["team-1"]);
  assert.throws(() => buildSpecialRequestPayload({
    memberId: "member-1",
    requestDate: "2026-11-12",
    requestText: "Request",
    divisionId: "division-1",
    teamId: "team-2",
  }, teams), /does not belong/i);
});

test("member search uses names and email and caps large result sets", () => {
  const members = [
    { id: "2", first_name: "Bryn", last_name: "Jones", email: "bryn@example.test" },
    { id: "1", full_name: "Alex Smith", email: "alex@example.test" },
  ];

  assert.equal(specialRequestMemberLabel(members[0]), "Bryn Jones");
  assert.deepEqual(filterSpecialRequestMembers(members, "alex").map((member) => member.id), ["1"]);
  assert.deepEqual(filterSpecialRequestMembers(members, "example.test", 1).map((member) => member.id), ["1"]);
});

test("Special Requests filter exactly and sort upcoming before past", () => {
  const rows = [
    { id: "past-newer", request_date: "2026-09-16", location_id: "location-1", division_id: "division-1", team_id: "team-1" },
    { id: "future-later", request_date: "2026-10-02", location_id: "location-2", division_id: "division-2", team_id: "team-2" },
    { id: "future-sooner", request_date: "2026-09-20", location_id: "location-1", division_id: "division-1", team_id: "team-1" },
    { id: "past-older", request_date: "2026-08-01", location_id: "location-1", division_id: "division-1", team_id: "team-1" },
  ];

  assert.deepEqual(
    filterAndSortSpecialRequests(rows, {}, "2026-09-18").map((row) => row.id),
    ["future-sooner", "future-later", "past-newer", "past-older"]
  );
  assert.deepEqual(
    filterAndSortSpecialRequests(rows, { locationId: "location-1", requestDate: "2026-09-20" }, "2026-09-18").map((row) => row.id),
    ["future-sooner"]
  );
});

test("Scheduling UI exposes CRUD and filters while generation remains request-independent", () => {
  const page = fs.readFileSync(new URL("../app/scheduling/page.js", import.meta.url), "utf8");
  const migration = fs.readFileSync(new URL("../supabase/migrations/20260918150701_scheduling_special_requests.sql", import.meta.url), "utf8");
  const generation = page.slice(page.indexOf("async function generateSchedule"), page.indexOf("async function deleteGeneratedSchedule"));

  assert.match(page, /useState\("settings"\)/);
  assert.ok(page.indexOf('id: "settings"') < page.indexOf('id: "courts"'));
  assert.ok(page.indexOf('id: "courts"') < page.indexOf('id: "blackouts"'));
  assert.ok(page.indexOf('id: "blackouts"') < page.indexOf('id: "requests"'));
  assert.match(page, /Add Special Request/);
  assert.match(page, /Edit Special Request/);
  assert.match(page, /Delete this Special Request/);
  assert.match(page, /Filter Special Requests by Location/);
  assert.match(page, /Filter Special Requests by Division/);
  assert.match(page, /Filter Special Requests by Team/);
  assert.match(page, /Filter Special Requests by Date/);
  assert.doesNotMatch(generation, /specialRequest/i);
  assert.match(migration, /Administrative tracking only/);
  assert.doesNotMatch(migration, /references public\.matches|references public\.league_schedule_settings|references public\.location_court_availability/i);
});
