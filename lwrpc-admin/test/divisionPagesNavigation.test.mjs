import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { adminNavigationSections } from "../app/lib/adminNavigation.js";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

test("People & Teams uses durable routes for Division Standings and Division Schedules", () => {
  const peopleCards = adminNavigationSections("commissioner").find((section) => section.key === "people").cards;
  const standings = peopleCards.find((card) => card.title === "Division Standings");
  const schedules = peopleCards.find((card) => card.title === "Division Schedules");

  assert.equal(standings.path, "/division-standings");
  assert.equal(schedules.path, "/division-schedules");
  assert.equal(standings.dialog, undefined);
  assert.equal(schedules.dialog, undefined);
});

test("dedicated division pages retain manager authorization and read-only data access", () => {
  const standingsPage = read("../app/division-standings/page.js");
  const schedulesPage = read("../app/division-schedules/page.js");

  for (const page of [standingsPage, schedulesPage]) {
    assert.match(page, /requireRole\(router, "league_manager"\)/);
    assert.doesNotMatch(page, /\.insert\(|\.update\(|\.upsert\(|\.delete\(|\.rpc\(/);
  }

  assert.match(standingsPage, /new URLSearchParams\(window\.location\.search\)\.get\("division"\)/);
  assert.match(schedulesPage, /params\.get\("division"\)/);
  assert.match(schedulesPage, /params\.get\("team"\)/);
});

test("Administration Desktop no longer owns the two obsolete division popup flows", () => {
  const dashboard = read("../app/AdminDashboardClient.js");
  const preview = read("../app/design-preview/admin/AdminDesignPreviewView.js");

  assert.doesNotMatch(dashboard, /DivisionStandingsModal|openDivisionTool|divisionStandingsOpen|divisionScheduleOpen/);
  assert.doesNotMatch(preview, /card\.dialog==="division-standings"|card\.dialog==="division-schedules"/);
});

test("Division Schedules reuses the existing schedule display without modal positioning", () => {
  const schedulePage = read("../app/division-schedules/page.js");
  const scheduleView = read("../app/components/TeamScheduleModal.js");

  assert.match(schedulePage, /<TeamScheduleModal[\s\S]*?page/);
  assert.match(scheduleView, /page \? "w-full" : "fixed inset-0/);
});

test("End of Season Points remains on League Standings unchanged", () => {
  const standingsPage = read("../app/standings/page.js");

  assert.match(standingsPage, /End of Season Points/);
  assert.match(standingsPage, /\/api\/standings-compensation/);
  assert.match(standingsPage, /DUPR Rules Rule 6\.3\.9/);
});
