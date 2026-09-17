import test from "node:test";
import assert from "node:assert/strict";
import {
  buildMemberLocationReviewRows,
  buildSafeMemberLocationTextUpdates,
  memberLocationReviewCsv,
  membershipWorksLocationFromRaw,
} from "../app/lib/memberLocationReviewExport.js";
import { readFile } from "node:fs/promises";

const batch = {
  created_at: "2026-09-17T12:00:00Z",
  file_name: "members.csv",
};

const locations = [
  { id: "heights", name: "Esplanade at the Heights", is_active: true },
  { id: "indigo", name: "Indigo @ LWR", is_active: true },
];

test("reads the same MembershipWorks Location headers as the import preview", () => {
  assert.equal(membershipWorksLocationFromRaw({ " Home Community ": " The Heights " }), "The Heights");
  assert.equal(membershipWorksLocationFromRaw({ Email: "a@example.com" }), "");
});

test("exports unresolved aliases with the saved and linked Location values", () => {
  const rows = buildMemberLocationReviewRows({
    batch,
    auditRows: [{
      row_number: 8,
      action: "update",
      email: "PLAYER@EXAMPLE.COM",
      membershipworks_id: "mw-8",
      first_name: "Pat",
      last_name: "Player",
      raw_data: { "Club/Location": "The Heights" },
    }],
    members: [{
      id: "member-8",
      email: "player@example.com",
      first_name: "Pat",
      last_name: "Player",
      membershipworks_account_id: "mw-8",
      club_location: "The Heights",
      location_id: "heights",
    }],
    locations,
  });

  assert.equal(rows.length, 1);
  assert.equal(rows[0][9], "The Heights");
  assert.equal(rows[0][10], "The Heights");
  assert.equal(rows[0][11], "Esplanade at the Heights");
  assert.match(rows[0][13], /alias or conflict/);
});

test("omits exact matches and skipped audit rows", () => {
  const rows = buildMemberLocationReviewRows({
    batch,
    auditRows: [
      { row_number: 1, action: "update", email: "exact@example.com", raw_data: { Location: "Indigo @ LWR" } },
      { row_number: 2, action: "skip", email: "skip@example.com", raw_data: { Location: "Unknown" } },
    ],
    members: [{
      id: "exact",
      email: "exact@example.com",
      club_location: "Indigo @ LWR",
      location_id: "indigo",
    }],
    locations,
  });

  assert.deepEqual(rows, []);
});

test("CSV export includes a header and neutralizes spreadsheet formulas", () => {
  const csv = memberLocationReviewCsv([["=danger", "members.csv", ...Array(12).fill("")]]);
  assert.match(csv, /^Import Date,Import File/);
  assert.match(csv, /'=danger/);
});

test("builds a safe saved-Location correction when MembershipWorks and the link agree", () => {
  const updates = buildSafeMemberLocationTextUpdates({
    auditRows: [{
      action: "update",
      email: "player@example.com",
      membershipworks_id: "mw-8",
      raw_data: { "Club/Location": "Esplanade at Artisan Lakes" },
    }],
    members: [{
      id: "member-8",
      email: "player@example.com",
      membershipworks_account_id: "mw-8",
      club_location: "Artisan Lakes - Esplanade Palmetto",
      location_id: "artisan",
    }],
    locations: [{ id: "artisan", name: "Esplanade at Artisan Lakes", is_active: true }],
  });

  assert.deepEqual(updates, [{
    id: "member-8",
    club_location: "Esplanade at Artisan Lakes",
    expectedClubLocation: "Artisan Lakes - Esplanade Palmetto",
    expectedLocationId: "artisan",
  }]);
});

test("does not correct ambiguous, conflicting, skipped, unlinked, or already-current Location text", () => {
  const members = [
    { id: "conflict", email: "conflict@example.com", club_location: "Old", location_id: "heights" },
    { id: "duplicate", email: "duplicate@example.com", club_location: "Old", location_id: "heights" },
    { id: "skipped", email: "skipped@example.com", club_location: "Old", location_id: "heights" },
    { id: "unlinked", email: "unlinked@example.com", club_location: "Old", location_id: null },
    { id: "current", email: "current@example.com", club_location: "Esplanade at the Heights", location_id: "heights" },
  ];
  const auditRows = [
    { action: "update", email: "conflict@example.com", raw_data: { Location: "Indigo @ LWR" } },
    { action: "update", email: "duplicate@example.com", raw_data: { Location: "Esplanade at the Heights" } },
    { action: "update", email: "duplicate@example.com", raw_data: { Location: "Indigo @ LWR" } },
    { action: "skip", email: "skipped@example.com", raw_data: { Location: "Esplanade at the Heights" } },
    { action: "update", email: "unlinked@example.com", raw_data: { Location: "Esplanade at the Heights" } },
    { action: "update", email: "current@example.com", raw_data: { Location: "Esplanade at the Heights" } },
  ];

  assert.deepEqual(buildSafeMemberLocationTextUpdates({ auditRows, members, locations }), []);
});

test("Clean Members invokes the safe saved-Location correction and reports its count", async () => {
  const source = await readFile(new URL("../app/members/page.js", import.meta.url), "utf8");
  assert.match(source, /buildSafeMemberLocationTextUpdates\(\{/);
  assert.match(source, /Saved Location text corrected:/);
  assert.match(source, /latest MembershipWorks Location agree/);
});
