import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  rosterPlayerCheckRecipientEmails,
  rosterPlayerCheckSelectionMessage,
  rosterPlayerInformationStatus,
  rosterPlayerNeedsInformationCheck,
  rosterPlayerSelectionDisabled,
} from "../app/lib/rosterPlayerChecks.js";

test("Not Eligible roster options are disabled while missing-information players remain selectable", () => {
  assert.equal(rosterPlayerSelectionDisabled("Not Eligible"), true);
  assert.equal(rosterPlayerSelectionDisabled("Eligible"), false);
  assert.equal(rosterPlayerSelectionDisabled("Rating Needed"), false);
  assert.equal(rosterPlayerSelectionDisabled("DUPR ID Needed"), false);
});

test("only Rating Needed and DUPR ID Needed selections trigger the information-check notice", () => {
  assert.equal(rosterPlayerNeedsInformationCheck("Rating Needed"), true);
  assert.equal(rosterPlayerNeedsInformationCheck("DUPR ID Needed"), true);
  assert.equal(rosterPlayerNeedsInformationCheck("Eligible"), false);
  assert.equal(rosterPlayerNeedsInformationCheck("Not Eligible"), false);
});

test("roster cards identify missing DUPR IDs before missing ratings", () => {
  assert.equal(
    rosterPlayerInformationStatus({ duprId: "", rating: null }),
    "DUPR ID Needed"
  );
  assert.equal(
    rosterPlayerInformationStatus({ duprId: "123456", rating: null }),
    "Rating Needed"
  );
  assert.equal(
    rosterPlayerInformationStatus({ duprId: "123456", rating: "NR" }),
    "Rating Needed"
  );
  assert.equal(
    rosterPlayerInformationStatus({ duprId: "123456", rating: 4.25 }),
    ""
  );
});

test("player and captain roster-check recipients are trimmed and deduplicated", () => {
  assert.deepEqual(
    rosterPlayerCheckRecipientEmails([
      { email: " player@example.com " },
      { email: "captain@example.com" },
      { email: "PLAYER@example.com" },
      { email: "" },
      null,
    ]),
    ["player@example.com", "captain@example.com"]
  );
});

test("selection notice explains both roster-check emails before the player is added", () => {
  const message = rosterPlayerCheckSelectionMessage({
    playerName: "Alex Player",
    status: "Rating Needed",
    ratingLabel: "Season DUPR Rating",
  });

  assert.match(message, /Alex Player does not currently have a Season DUPR Rating entered/);
  assert.match(message, /League Management will receive a player-check alert/);
  assert.match(message, /separate email will be sent to the player and this team's Captain\/Co-Captain\(s\)/);
});

test("Roster Player Check Alert-To Player is registered for Email Options", () => {
  const source = fs.readFileSync(
    new URL("../app/lib/emailTemplates.js", import.meta.url),
    "utf8"
  );

  assert.match(source, /ratingCheckAlertToPlayer: "rating_check_alert_to_player"/);
  assert.match(source, /label: "Roster Player Check Alert-To Player"/);
  assert.match(source, /key: EMAIL_TEMPLATE_KEYS\.ratingCheckAlertToPlayer/);
  assert.match(source, /Hello \{\{player_name\}\} and Team Captains/);
  assert.match(source, /League Management has also been notified/);
});

test("both roster player selectors use the guarded selection handler", () => {
  const source = fs.readFileSync(
    new URL("../app/teams/[id]/page.js", import.meta.url),
    "utf8"
  );

  assert.equal(
    source.match(/onChange=\{e => handleAvailablePlayerSelection\(e\.target\.value\)\}/g)?.length,
    2
  );
  assert.equal(
    source.match(/disabled=\{rosterPlayerSelectionDisabled\(playerRatingEligibility\(member\)\)\}/g)?.length,
    2
  );
  assert.match(source, /EMAIL_TEMPLATE_KEYS\.ratingCheckAlertToPlayer/);
  assert.match(source, /Promise\.allSettled/);
});

test("roster management and Captain View Team visibly flag missing player information", () => {
  const teamSource = fs.readFileSync(
    new URL("../app/teams/[id]/page.js", import.meta.url),
    "utf8"
  );
  const captainSource = fs.readFileSync(
    new URL("../app/captain-dashboard/page.js", import.meta.url),
    "utf8"
  );

  assert.match(teamSource, /border-red-400 bg-red-100/);
  assert.match(teamSource, /\{playerInformationStatus\}/);
  assert.match(captainSource, /phone,\s+dupr_id,\s+self_rating/);
  assert.match(captainSource, /border-red-300 bg-red-100/);
  assert.match(captainSource, /\{playerInformationStatus\}/);
});
