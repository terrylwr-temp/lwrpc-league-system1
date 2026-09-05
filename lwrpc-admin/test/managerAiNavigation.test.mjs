import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { adminNavigationSections } from "../app/lib/adminNavigation.js";
import { isNavigationPathActive } from "../app/lib/navigationActiveState.js";
const system = adminNavigationSections("commissioner").find(s => s.key === "system");
const active = pathname => system.cards.filter(c => !c.dialog && isNavigationPathActive(pathname, c.path, [], c.exact)).map(c => c.title);
test("LMS-0715 AI management is an exact leaf, console alone is active on its route", () => {
  assert.deepEqual(active("/ai-assistant"), ["AI Assistant Management"]);
  assert.deepEqual(active("/ai-assistant/"), ["AI Assistant Management"]);
  assert.deepEqual(active("/ai-assistant/console"), ["Test AI Assistant"]);
  assert.deepEqual(active("/ai-assistant/console/"), ["Test AI Assistant"]);
  assert.deepEqual(active("/ai-assistant-other"), []);
});
test("LMS-0715 other System Setup and existing descendant/alias matching remain unchanged", () => {
  for (const c of system.cards.filter(c => !c.dialog && !c.path.startsWith("/ai-assistant"))) {
    assert.deepEqual(active(c.path), [c.title]); assert.deepEqual(active(`${c.path}/detail`), [c.title]);
  }
  assert.equal(isNavigationPathActive("/", "/"), true);
  assert.equal(isNavigationPathActive("/members/123", "/"), false);
  assert.equal(isNavigationPathActive("/members/123", "/members"), true);
  assert.equal(isNavigationPathActive("/memberstuff", "/members"), false);
  assert.equal(isNavigationPathActive("/alternate/detail", "/main", ["/alternate"]), true);
  assert.equal(adminNavigationSections("player").length, 0);
  assert.ok(adminNavigationSections("league_manager").find(s => s.key === "system").cards.some(c => c.title === "Test AI Assistant"));
});
test("LMS-0715 shared desktop/mobile navigation wires exact matching and header action has content/contrast", async () => {
  const header = await readFile(new URL("../app/components/AppHeader.js", import.meta.url), "utf8");
  const page = await readFile(new URL("../app/ai-assistant/console/page.js", import.meta.url), "utf8");
  assert.match(header, /exact: card.exact/); assert.match(header, /isNavigationPathActive\(pathname, path, aliases, exact\)/);
  assert.match(header, /isPathActive\(link.path, link.aliases, link.exact\)/);
  assert.ok((header.match(/<Navigation/g) || []).length >= 2);
  assert.match(page, /type="button" onClick=\{\(\) => router.push\("\/ai-assistant"\)\} className=\{secondary\}>AI Source Management<\/button>/);
  const secondary = page.match(/const secondary="([^"]+)"/)[1];
  assert.match(secondary, /text-slate-800/); assert.match(secondary, /bg-white/); assert.match(secondary, /min-h-11 max-w-full/);
  assert.match(page, /requireRole\(router, "league_manager"\)/);
});
