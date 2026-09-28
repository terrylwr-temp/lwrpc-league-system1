import test from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { deleteGeneratedScheduleRows } from "../app/lib/deleteGeneratedSchedule.js";
import { scheduleSettingMatches } from "../app/lib/scheduleSettingsCopy.js";

const uuid = (number) => `00000000-0000-4000-8000-${String(number).padStart(12, "0")}`;
const sourceId = uuid(1);
const copyId = uuid(2);

// Exercise the real supabase-js HTTP serialization against isolated rows.
// The adapter enforces URL/row limits and child foreign keys; it never connects
// to a live database or uses an application credential.
function fixture({ matchCount = 32, linesPerMatch = 25, isCopy = false, failRequest = () => false } = {}) {
  const setting = {
    id: isCopy ? copyId : sourceId, league_id: uuid(3), division_id: uuid(4), is_copy: isCopy,
    season_start_date: "2026-10-24", season_end_date: "2027-02-27",
  };
  const matches = Array.from({ length: matchCount }, (_, index) => ({
    id: uuid(100 + index), league_id: setting.league_id, division_id: setting.division_id,
    scheduled_date: "2026-10-24", schedule_setting_id: setting.id,
  }));
  const foreignMatches = [
    { ...matches[0], id: uuid(500), schedule_setting_id: isCopy ? sourceId : copyId },
    { ...matches[0], id: uuid(501), division_id: uuid(5) },
    { ...matches[0], id: uuid(502), scheduled_date: "2027-03-01" },
  ];
  let nextLineId = 1000;
  const lines = matches.flatMap((match) => Array.from({ length: linesPerMatch }, () => ({
    id: uuid(nextLineId++), match_id: match.id,
  })));
  const foreignLines = foreignMatches.map((match, index) => ({ id: uuid(90000 + index), match_id: match.id }));
  const allLines = [...lines, ...foreignLines];
  const games = allLines.map((line, index) => ({ id: uuid(100000 + index), match_line_id: line.id }));
  const byes = [
    { id: uuid(200000), league_id: setting.league_id, division_id: setting.division_id, schedule_setting_id: null },
    { id: uuid(200001), league_id: setting.league_id, division_id: setting.division_id, schedule_setting_id: sourceId },
    { id: uuid(200002), league_id: setting.league_id, division_id: setting.division_id, schedule_setting_id: copyId },
    { id: uuid(200003), league_id: uuid(6), division_id: setting.division_id, schedule_setting_id: setting.id },
    { id: uuid(200004), league_id: setting.league_id, division_id: uuid(5), schedule_setting_id: setting.id },
  ];
  const rows = { matches: [...matches, ...foreignMatches], match_lines: allLines, line_games: games, team_byes: byes };
  const requests = [];
  const client = createClient("https://schedule-delete.test", "isolated-test-key", {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: async (input, init) => {
      const url = new URL(input);
      assert.equal(url.origin, "https://schedule-delete.test");
      const table = url.pathname.split("/").at(-1);
      const method = init?.method || "GET";
      const request = { table, method, urlLength: url.href.length, offset: Number(url.searchParams.get("offset") || 0) };
      requests.push(request);
      if (url.href.length > 8192) return Response.json({ message: "Bad Request" }, { status: 400 });
      if (failRequest(request)) return Response.json({ message: "Injected request failure" }, { status: 403 });
      let selected = rows[table].filter((row) => [...url.searchParams].every(([column, filter]) => {
        if (filter.startsWith("in.(")) return filter.slice(4, -1).split(",").includes(row[column]);
        if (filter.startsWith("eq.")) return row[column] === filter.slice(3);
        if (column === "or") {
          const settingId = filter.slice(1, -1).split("schedule_setting_id.eq.")[1];
          return row.schedule_setting_id === null || row.schedule_setting_id === settingId;
        }
        return true;
      }));
      if (method === "GET") {
        assert.equal(table, "match_lines");
        assert.equal(url.searchParams.get("order"), "id.asc");
        selected.sort((a, b) => a.id.localeCompare(b.id));
        const limit = Math.min(Number(url.searchParams.get("limit") || 1000), 1000);
        return Response.json(selected.slice(request.offset, request.offset + limit).map(({ id }) => ({ id })));
      }
      assert.equal(method, "DELETE");
      if (table === "match_lines") {
        assert.ok(!rows.line_games.some((game) => selected.some((line) => line.id === game.match_line_id)), "games must be removed before lines");
      }
      if (table === "matches") {
        assert.ok(!rows.match_lines.some((line) => selected.some((match) => match.id === line.match_id)), "lines must be removed before matches");
      }
      rows[table] = rows[table].filter((row) => !selected.includes(row));
      return new Response(null, { status: 204 });
    } },
  });
  return { client, setting, rows, requests, matchIds: scheduleSettingMatches(setting, rows.matches).map(({ id }) => id), foreignMatches, foreignLines };
}

test("SDUPR8-sized schedule deletes without an oversized URL and preserves unrelated rows", async () => {
  const f = fixture();
  assert.equal(f.matchIds.length, 32);
  assert.equal(f.rows.match_lines.length, 803);
  assert.equal((await deleteGeneratedScheduleRows(f.client, f.setting, f.matchIds)).error, null);
  assert.deepEqual(f.rows.matches, f.foreignMatches);
  assert.deepEqual(f.rows.match_lines, f.foreignLines);
  assert.deepEqual(f.rows.line_games.map(({ match_line_id }) => match_line_id), f.foreignLines.map(({ id }) => id));
  assert.deepEqual(f.rows.team_byes.map(({ id }) => id), [uuid(200002), uuid(200003), uuid(200004)]);
  assert.ok(f.requests.every(({ urlLength }) => urlLength < 8192));
  assert.equal(f.requests.filter(({ table, method }) => table === "line_games" && method === "DELETE").length, 16);
});

test("large schedules paginate line lookups and batch every ID-filtered delete", async () => {
  const f = fixture({ matchCount: 100 });
  assert.equal((await deleteGeneratedScheduleRows(f.client, f.setting, f.matchIds)).error, null);
  assert.deepEqual(f.requests.filter(({ method }) => method === "GET").map(({ offset }) => offset), [0, 1000, 0, 1000]);
  assert.deepEqual(f.rows.matches, f.foreignMatches);
  assert.deepEqual(f.rows.match_lines, f.foreignLines);
  assert.equal(f.rows.line_games.length, 3);
  assert.ok(f.requests.every(({ urlLength }) => urlLength < 8192));
});

test("copied setting deletes only its matches and linked byes", async () => {
  const f = fixture({ isCopy: true, matchCount: 1, linesPerMatch: 1 });
  assert.equal((await deleteGeneratedScheduleRows(f.client, f.setting, f.matchIds)).error, null);
  assert.deepEqual(f.rows.matches, f.foreignMatches);
  assert.deepEqual(f.rows.team_byes.map(({ id }) => id), [uuid(200000), uuid(200001), uuid(200003), uuid(200004)]);
});

test("failure on a later line-lookup page prevents every write", async () => {
  const f = fixture({ matchCount: 50, failRequest: ({ method, offset }) => method === "GET" && offset === 1000 });
  const before = structuredClone(f.rows);
  const result = await deleteGeneratedScheduleRows(f.client, f.setting, f.matchIds);
  assert.equal(result.stage, "loading match lines");
  assert.equal(result.error.message, "Injected request failure");
  assert.deepEqual(f.rows, before);
  assert.ok(f.requests.every(({ method }) => method === "GET"));
});

test("failure on a later game-delete batch stops before any parent deletion", async () => {
  let gameDeletes = 0;
  const f = fixture({ failRequest: ({ method, table }) => method === "DELETE" && table === "line_games" && ++gameDeletes === 2 });
  const result = await deleteGeneratedScheduleRows(f.client, f.setting, f.matchIds);
  assert.equal(result.stage, "deleting game score rows");
  assert.equal(result.error.message, "Injected request failure");
  assert.equal(f.rows.match_lines.length, 803);
  assert.equal(f.rows.matches.length, 35);
  assert.equal(f.rows.team_byes.length, 5);
  assert.ok(!f.requests.some(({ method, table }) => method === "DELETE" && table !== "line_games"));
});

for (const [failedTable, stage, laterTables] of [
  ["match_lines", "deleting match lines", ["matches", "team_byes"]],
  ["matches", "deleting matches", ["team_byes"]],
  ["team_byes", "deleting bye rows", []],
]) {
  test(`${failedTable} error is reported and prevents subsequent deletion stages`, async () => {
    const f = fixture({ matchCount: 1, linesPerMatch: 1, failRequest: ({ method, table }) => method === "DELETE" && table === failedTable });
    const result = await deleteGeneratedScheduleRows(f.client, f.setting, f.matchIds);
    assert.equal(result.stage, stage);
    assert.equal(result.error.message, "Injected request failure");
    assert.ok(!f.requests.some(({ method, table }) => method === "DELETE" && laterTables.includes(table)));
  });
}

test("a schedule without lines skips game deletion and still removes its matches", async () => {
  const f = fixture({ matchCount: 1, linesPerMatch: 0 });
  assert.equal((await deleteGeneratedScheduleRows(f.client, f.setting, f.matchIds)).error, null);
  assert.deepEqual(f.rows.matches, f.foreignMatches);
  assert.ok(!f.requests.some(({ table }) => table === "line_games"));
});

test("an empty match selection never deletes byes or sends a request", async () => {
  const f = fixture();
  const before = structuredClone(f.rows);
  assert.equal((await deleteGeneratedScheduleRows(f.client, f.setting, [])).error, null);
  assert.deepEqual(f.rows, before);
  assert.deepEqual(f.requests, []);
});
