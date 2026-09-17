import test from "node:test";
import assert from "node:assert/strict";
import {
  buildMemberLocationReviewRows,
  memberLocationReviewCsv,
  membershipWorksLocationFromRaw,
} from "../app/lib/memberLocationReviewExport.js";

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
