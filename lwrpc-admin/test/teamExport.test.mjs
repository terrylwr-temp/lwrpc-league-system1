import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  buildTeamExportCsv,
  buildTeamExportRows,
  TEAM_EXPORT_HEADERS,
  teamExportFilename,
} from "../app/lib/teamExport.js";

const team = {
  id: "team-1",
  name: "Lakewood Aces",
  abbreviation: "LWA",
  team_number: 7,
  is_active: true,
  division_id: "division-1",
  home_location_id: "location-1",
  captain_member_id: "captain-1",
  co_captain_member_id: "co-1",
  co_captain_2_member_id: "co-2",
  club_pro_member_id: "pro-1",
  roster_count: 12,
  notes: "Home court near gate, use courts 1-4",
  created_at: "2026-09-01T12:00:00Z",
  updated_at: "2026-09-17T12:00:00Z",
  divisions: {
    id: "division-1",
    name: "DUPR 7",
    rating_type: "dupr",
    leagues: {
      id: "league-1",
      name: "Weekday DUPR",
      season_id: "season-1",
      rosters_locked: false,
      seasons: { id: "season-1", name: "2026 Fall" },
    },
  },
  locations: {
    id: "location-1",
    name: "Lakewood Ranch Country Club",
    address: "7650 Legacy Blvd",
    city: "Lakewood Ranch",
    state: "FL",
    zip_code: "34202",
    number_of_courts: 8,
    court_notes: "Enter through the east gate",
  },
  captain: { id: "captain-1", first_name: "Casey", last_name: "Captain", email: "casey@example.com" },
  co_captain_1: { id: "co-1", full_name: "Cory One", email: "cory1@example.com" },
  co_captain_2: { id: "co-2", full_name: "Cory Two", email: "cory2@example.com" },
  club_pro: { id: "pro-1", full_name: "Pat Pro", email: "pat@example.com" },
};

test("team export includes entered team, leadership, roster, and full location information", () => {
  const [row] = buildTeamExportRows([team]);
  const values = Object.fromEntries(TEAM_EXPORT_HEADERS.map((header, index) => [header, row[index]]));

  assert.equal(values["Team Name"], "Lakewood Aces");
  assert.equal(values["Season"], "2026 Fall");
  assert.equal(values["League"], "Weekday DUPR");
  assert.equal(values["Division"], "DUPR 7");
  assert.equal(values["Location Full Address"], "7650 Legacy Blvd, Lakewood Ranch, FL 34202");
  assert.equal(values["Location Courts"], 8);
  assert.equal(values["Captain"], "Casey Captain");
  assert.equal(values["Co-Captain 2 Email"], "cory2@example.com");
  assert.equal(values["Club Pro"], "Pat Pro");
  assert.equal(values["Roster Count"], 12);
  assert.equal(values["Team Notes"], "Home court near gate, use courts 1-4");
});

test("team export creates an Excel-friendly CSV and protects formula-like cells", () => {
  const csv = buildTeamExportCsv([{ ...team, name: "=FORMULA", notes: 'Quoted "note"\nsecond line' }]);

  assert.ok(csv.startsWith("\uFEFFTeam ID,Team Name"));
  assert.match(csv, /'=FORMULA/);
  assert.match(csv, /"Quoted ""note""\nsecond line"/);
  assert.match(csv, /7650 Legacy Blvd, Lakewood Ranch, FL 34202/);
  assert.doesNotMatch(csv, /\[object Object\]/);
});

test("Teams & Rosters places Export Teams beside Copy Division Teams and loads address fields", () => {
  const source = fs.readFileSync(new URL("../app/teams/page.js", import.meta.url), "utf8");

  assert.match(source, /Copy Division Teams[\s\S]{0,600}Export Teams/);
  assert.match(source, /id, name, address, city, state, zip_code, number_of_courts, court_notes/);
  assert.match(source, /buildTeamExportCsv\(teams\)/);
  assert.equal(teamExportFilename(new Date(2026, 8, 17)), "lwrpc-teams-and-rosters-2026-09-17.csv");
});
