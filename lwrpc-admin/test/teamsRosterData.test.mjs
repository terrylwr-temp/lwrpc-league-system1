import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { hasRole } from "../app/lib/permissions.js";
import {
  filterTeamsForRosterManagement,
  hydrateTeamsForRosterManagement,
  TEAM_ROSTER_TEAM_COLUMNS,
  teamRosterListingCounts,
} from "../app/lib/teamRosterData.js";

const season = { id: "season-current", name: "Fall 2026", is_active: true };
const league = {
  id: "league-authorized",
  name: "Weekday DUPR",
  season_id: season.id,
  rosters_locked: false,
  is_active: true,
  seasons: season,
};
const division = {
  id: "division-authorized",
  name: "DUPR 7",
  league_id: league.id,
  rating_type: "dupr",
  is_active: true,
};
const location = { id: "location-1", name: "Lakewood Ranch", address: "123 Main St" };
const captain = { id: "member-1", full_name: "Casey Captain", email: "casey@example.com" };
const authorizedTeams = [
  {
    id: "team-active",
    name: "Aces",
    division_id: division.id,
    home_location_id: location.id,
    captain_member_id: captain.id,
    is_active: true,
  },
  {
    id: "team-inactive",
    name: "Retired Aces",
    division_id: division.id,
    home_location_id: location.id,
    is_active: false,
  },
];

function hydrate(overrides = {}) {
  return hydrateTeamsForRosterManagement({
    teams: authorizedTeams,
    divisions: [division],
    leagues: [league],
    locations: [location],
    members: [captain],
    rosterRows: [
      { team_id: "team-active" },
      { team_id: "team-active" },
      { team_id: "team-inactive" },
    ],
    ...overrides,
  });
}

test("Commissioner receives every team returned within the authorized database scope", () => {
  assert.deepEqual(
    Object.fromEntries(
      ["commissioner", "league_manager", "club_pro", "captain", "player"]
        .map((role) => [role, hasRole(role, "captain")])
    ),
    {
      commissioner: true,
      league_manager: true,
      club_pro: true,
      captain: true,
      player: false,
    }
  );

  const teams = hydrate({
    divisions: [division, { id: "other-division", league_id: "other-league", name: "Other" }],
    leagues: [league, { id: "other-league", name: "Other League", is_active: true }],
  });

  assert.deepEqual(teams.map((team) => team.id), ["team-active", "team-inactive"]);
  assert.equal(teams[0].divisions.leagues.name, "Weekday DUPR");
  assert.equal(teams[0].locations.name, "Lakewood Ranch");
  assert.equal(teams[0].captain.full_name, "Casey Captain");
  assert.equal(teams[0].roster_count, 2);
  assert.equal(teams[1].roster_count, 1);
});

test("hydration cannot introduce unauthorized cross-scope teams from lookup rows", () => {
  const teams = hydrate({
    teams: [authorizedTeams[0]],
    divisions: [division, { id: "not-authorized", league_id: league.id, name: "Hidden" }],
    rosterRows: [{ team_id: "team-active" }, { team_id: "hidden-team" }],
  });

  assert.deepEqual(teams.map((team) => team.id), ["team-active"]);
  assert.equal(teams[0].roster_count, 1);
});

test("active, inactive, league, division, and season scoping remains unchanged", () => {
  const currentTeams = hydrate();
  const inactiveDivisionTeam = hydrate({
    teams: [{ ...authorizedTeams[0], id: "inactive-division-team" }],
    divisions: [{ ...division, is_active: false }],
  })[0];
  const inactiveLeagueTeam = hydrate({
    teams: [{ ...authorizedTeams[0], id: "inactive-league-team" }],
    leagues: [{ ...league, is_active: false }],
  })[0];
  const inactiveSeasonTeam = hydrate({
    teams: [{ ...authorizedTeams[0], id: "inactive-season-team" }],
    leagues: [{ ...league, seasons: { ...season, is_active: false } }],
  })[0];
  const allTeams = [...currentTeams, inactiveDivisionTeam, inactiveLeagueTeam, inactiveSeasonTeam];

  assert.deepEqual(
    filterTeamsForRosterManagement(allTeams).map((team) => team.id),
    ["team-active"]
  );
  assert.equal(filterTeamsForRosterManagement(allTeams, { includeInactive: true }).length, 5);
});

test("displayed and total team counts match the returned and filtered records", () => {
  const teams = hydrate();
  const visibleTeams = filterTeamsForRosterManagement(teams);

  assert.deepEqual(teamRosterListingCounts(teams, visibleTeams), { shown: 1, total: 2 });
  assert.deepEqual(
    teamRosterListingCounts(teams, filterTeamsForRosterManagement(teams, { includeInactive: true })),
    { shown: 2, total: 2 }
  );
});

test("Teams & Rosters uses a shallow team query and reports query failures instead of showing a false zero", () => {
  const source = readFileSync(new URL("../app/teams/page.js", import.meta.url), "utf8");

  assert.doesNotMatch(TEAM_ROSTER_TEAM_COLUMNS, /[()!*]/);
  assert.match(source, /\.from\("teams"\)\s*\.select\(TEAM_ROSTER_TEAM_COLUMNS\)/);
  assert.match(source, /if \(teamError\)[\s\S]{0,300}setLoadError/);
  assert.match(source, /Teams & Rosters could not be loaded/);
});

test("Teams & Rosters schedule action remains a contextual overlay", () => {
  const source = readFileSync(new URL("../app/teams/page.js", import.meta.url), "utf8");
  const start = source.indexOf("async function openTeamSchedule(team)");
  const end = source.indexOf("useEffect(() =>", start);
  const action = source.slice(start, end);

  assert.ok(start >= 0, "schedule action exists");
  assert.match(action, /setScheduleTeam\(team\)/);
  assert.doesNotMatch(action, /router\.push|window\.location/);
  assert.match(source, /\{scheduleTeam && \([\s\S]{0,300}<TeamScheduleModal/);
  assert.match(source, /onClose=\{\(\) => \{\s*setScheduleTeam\(null\)/);
});
