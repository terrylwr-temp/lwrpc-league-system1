import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import * as dateTime from "../app/lib/dateTime.js";
import * as specialMatchResults from "../app/lib/specialMatchResults.js";
import * as matchRatingSnapshots from "../app/lib/matchRatingSnapshots.js";

function parsedSource(path) {
  const source = readFileSync(new URL(path, import.meta.url), "utf8");
  return ts.createSourceFile("fixture.jsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JSX);
}

function evaluate(source, context) {
  const compiled = ts.transpileModule(source, {
    compilerOptions: { jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  return vm.runInNewContext(compiled, context);
}

const scheduleAst = parsedSource("../app/components/TeamScheduleModal.js");
const scheduleFunctions = scheduleAst.statements
  .filter(ts.isFunctionDeclaration)
  .map((node) => node.getText(scheduleAst).replace(/^export default /, ""));
const Schedule = evaluate(`${scheduleFunctions.join("\n")}\nTeamScheduleModal`, {
  React, ...React, ...dateTime, ...specialMatchResults, ...matchRatingSnapshots,
});
const textContent = (html) => html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
const captain = { id: "leader-1", full_name: "Casey Captain" };
const coCaptain1 = { id: "leader-2", first_name: "Cameron", last_name: "Co-Captain" };
const coCaptain2 = { id: "leader-3", full_name: "Charlie Second Co-Captain" };
const teams = [{
  id: "team-a", name: "Aces", captain, co_captain_1: coCaptain1, co_captain_2: coCaptain2,
  standing: { rank: 2, match_wins: 4, match_losses: 1, standings_points: 19 },
  locations: { name: "Home Courts" },
}, {
  id: "team-b", name: "Dinkers", captain: { full_name: "Different Captain" },
}];

function render(props = {}) {
  return renderToStaticMarkup(React.createElement(Schedule, {
    title: "Division Team Schedules", teams, selectedTeamId: "team-a", ...props,
  }));
}

for (const page of [true, false]) {
  test(`${page ? "Commissioner page" : "Captain overlay"}: one team format retains rank, record, and both co-captains`, () => {
    const html = render({ page, onClose: page ? undefined : () => {} });
    const buttons = [...html.matchAll(/<button\b[^>]*>([\s\S]*?)<\/button>/g)].map((match) => textContent(match[1]));
    assert.ok(!buttons.includes("Summary"));
    assert.ok(!buttons.includes("Detail"));
    assert.ok(buttons.some((label) => label.includes("#2 Aces") && label.includes("4-1 / 19 pts")));
    const content = textContent(html);
    assert.match(content, /Captain: Casey Captain/);
    assert.match(content, /Co-Captains: Cameron Co-Captain, Charlie Second Co-Captain/);
    assert.match(content, /Home Courts/);
    assert.equal(buttons.includes("Close"), !page);
    assert.doesNotMatch(content, /Different Captain/);
  });
}

test("changing selected teams replaces leader names; absent leaders and empty divisions still render", () => {
  const changed = textContent(render({ selectedTeamId: "team-b" }));
  assert.match(changed, /Captain: Different Captain/);
  assert.doesNotMatch(changed, /Casey Captain|Cameron Co-Captain|Charlie Second Co-Captain/);
  const absent = textContent(render({ teams: [{ id: "team-a", name: "No Leaders" }] }));
  assert.match(absent, /No Leaders/);
  assert.doesNotMatch(absent, /undefined|null/);
  assert.match(textContent(render({ teams: [], selectedTeamId: "" })), /Select a team/);
});

test("a co-captain remains visible when no captain or first co-captain is assigned", () => {
  const content = textContent(render({ teams: [{
    id: "team-a", name: "Aces", captain: null, co_captain_1: null, co_captain_2: coCaptain2,
  }] }));
  assert.match(content, /Co-Captains: Charlie Second Co-Captain/);
  assert.doesNotMatch(content, /(?:^| )Captain:|undefined|null/);
});

test("leader display retains full names, split names, long names, and existing overlay email fallback", () => {
  const longName = "Alexandra A Very Long Family Name That Must Remain Readable";
  const content = textContent(render({ teams: [{
    id: "team-a", name: "Aces", captain: { full_name: longName },
    co_captain_1: { first_name: "Split", last_name: "Name" },
    co_captain_2: { email: "assigned-captain@example.invalid" },
  }] }));
  assert.ok(content.includes(longName));
  assert.match(content, /Co-Captains: Split Name, assigned-captain@example.invalid/);
});

test("schedule display retains BYEs and verified-match details alongside the simplified team list", () => {
  const html = render({
    matches: [{
      id: "match-a", home_team_id: "team-a", away_team_id: "team-b",
      home_team: teams[0], away_team: teams[1], scheduled_date: "2026-09-20",
      scheduled_time: "09:00", week_number: 1, status: "completed", score_status: "verified",
      home_score: 3, away_score: 1, winning_team_id: "team-a", match_lines: [],
    }],
    byes: [{ id: "bye-a", team_id: "team-a", bye_date: "2026-09-27", week_number: 2 }],
  });
  assert.match(textContent(html), /BYE WEEK/);
  assert.match(textContent(html), /Aces vs Dinkers/);
  assert.match(textContent(html), /Show Match Details/);
});

const pageAst = parsedSource("../app/division-schedules/page.js");
let loaderSource;
function findLoader(node) {
  if (ts.isFunctionExpression(node) && node.name?.text === "loadDivisionSchedule") loaderSource = node.getText(pageAst);
  ts.forEachChild(node, findLoader);
}
findLoader(pageAst);
assert.ok(loaderSource, "the real division loader exists");
const loaderHelpers = pageAst.statements.filter((node) => ts.isFunctionDeclaration(node) && node.name?.text !== "DivisionSchedulesPage")
  .map((node) => node.getText(pageAst)).join("\n");
const divisionOptions = [{ id: "division-a", division: { leagues: { season_id: "season-a" } } }];

function loaderHarness({ leaderless = false, membersError = null } = {}) {
  const state = {};
  const requests = [];
  const rows = {
    teams: [
      { id: "team-a", name: "Aces", division_id: "division-a", is_active: true,
        captain_member_id: leaderless ? null : captain.id,
        co_captain_member_id: leaderless ? null : coCaptain1.id,
        co_captain_2_member_id: leaderless ? null : coCaptain2.id },
      { id: "team-b", name: "Dinkers", division_id: "division-a", is_active: true, captain_member_id: leaderless ? null : captain.id },
      { id: "retired", name: "Retired", division_id: "division-a", is_active: false, captain_member_id: "retired-leader" },
      { id: "outside", name: "Other Division", division_id: "division-b", is_active: true, captain_member_id: "other-leader" },
    ],
    members: [captain, coCaptain1, coCaptain2, { id: "other-leader", full_name: "Outside Scope" }],
    matches: [{ id: "published", division_id: "division-a", is_published: true }, { id: "draft", division_id: "division-a", is_published: false }],
    team_byes: [{ id: "bye", division_id: "division-a", team_id: "team-a" }],
    team_standings: [{ team_id: "team-a", division_id: "division-a", rank: 2 }, { team_id: "team-b", division_id: "division-a", rank: 1 }],
    member_season_ratings: [],
  };
  const supabase = { from(table) {
    const request = { table, columns: "", filters: [] };
    const query = {
      select(columns) { request.columns = columns; return query; },
      eq(column, value) { request.filters.push({ column, values: [value] }); return query; },
      in(column, values) { request.filters.push({ column, values: [...values] }); return query; },
      order() { return query; },
      then(resolve, reject) {
        requests.push(request);
        if (table === "members" && membersError) return Promise.resolve({ data: null, error: membersError }).then(resolve, reject);
        let data = rows[table].filter((row) => request.filters.every(({ column, values }) => values.includes(row[column])));
        if (table === "members") data = data.map((row) => Object.fromEntries(request.columns.split(",").map((key) => key.trim()).map((key) => [key, row[key]])));
        return Promise.resolve({ data, error: null }).then(resolve, reject);
      },
    };
    return query;
  } };
  const setters = Object.fromEntries(["SelectedDivisionId", "ScheduleLoading", "Error", "Teams", "Matches", "Byes", "Ratings", "SelectedTeam"]
    .map((key) => [`set${key}`, (value) => { state[key] = value; }]));
  const load = evaluate(`${loaderHelpers}\n(${loaderSource})`, { supabase, ...setters });
  return { state, requests, load: (preferred = "team-a") => load("division-a", divisionOptions, preferred) };
}

test("Commissioner loader reads only names for assigned leaders of active teams in the selected division", async () => {
  const harness = loaderHarness();
  await harness.load();
  const { state, requests } = harness;
  assert.deepEqual(Array.from(state.Teams, (team) => team.id), ["team-b", "team-a"]);
  assert.equal(state.SelectedTeam.id, "team-a");
  assert.equal(state.SelectedTeam.captain.full_name, "Casey Captain");
  assert.equal(state.SelectedTeam.co_captain_1.first_name, "Cameron");
  assert.equal(state.SelectedTeam.co_captain_2.full_name, "Charlie Second Co-Captain");
  const memberRequests = requests.filter((request) => request.table === "members");
  assert.ok(memberRequests.length > 0);
  assert.deepEqual(new Set(memberRequests.flatMap((request) => request.filters.filter((filter) => filter.column === "id").flatMap((filter) => filter.values))), new Set([captain.id, coCaptain1.id, coCaptain2.id]));
  for (const request of memberRequests) assert.deepEqual(new Set(request.columns.split(",").map((column) => column.trim())), new Set(["id", "first_name", "last_name", "full_name"]));
  assert.deepEqual(Array.from(state.Matches, (match) => match.id), ["published"]);
  assert.equal(state.Byes[0].id, "bye");
  assert.equal(state.ScheduleLoading, false);
  assert.equal(state.Error, "");
});

test("teams without assigned leaders avoid unrelated member reads and still load schedules", async () => {
  const harness = loaderHarness({ leaderless: true });
  await harness.load("missing-team");
  assert.equal(harness.requests.some((request) => request.table === "members"), false);
  assert.equal(harness.state.SelectedTeam.id, "team-b");
  assert.equal(harness.state.Matches.length, 1);
  assert.equal(harness.state.ScheduleLoading, false);
});

test("leader lookup errors remain visible while teams, selection, schedules, and byes stay available", async () => {
  const harness = loaderHarness({ membersError: { message: "Leader names unavailable" } });
  await harness.load();
  assert.match(harness.state.Error, /Leader names unavailable/);
  assert.equal(harness.state.ScheduleLoading, false);
  assert.deepEqual(Array.from(harness.state.Teams, (team) => team.id), ["team-b", "team-a"]);
  assert.equal(harness.state.SelectedTeam.id, "team-a");
  assert.equal(harness.state.SelectedTeam.captain, null);
  assert.deepEqual(Array.from(harness.state.Matches, (match) => match.id), ["published"]);
  assert.equal(harness.state.Byes[0].id, "bye");
});
