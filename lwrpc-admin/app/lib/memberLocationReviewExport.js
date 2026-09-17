import { memberImportLocationReview } from "./memberImportLocation.js";

const LOCATION_HEADERS = [
  "club/location",
  "club location",
  "home club",
  "home community",
  "community",
  "location",
  "primary club",
  "organization",
  "groups",
  "group",
  "membership group",
];

export const LOCATION_REVIEW_CSV_HEADER = [
  "Import Date",
  "Import File",
  "Import Row",
  "Import Action",
  "Member ID",
  "MembershipWorks ID",
  "First Name",
  "Last Name",
  "Email",
  "MembershipWorks Location",
  "Saved Location Text",
  "Linked Location",
  "Linked Location ID",
  "Review Reason",
];

export function membershipWorksLocationFromRaw(rawData) {
  const raw = rawData && typeof rawData === "object" ? rawData : {};
  const keysByName = new Map(
    Object.keys(raw).map((key) => [String(key).trim().toLowerCase(), key])
  );

  for (const header of LOCATION_HEADERS) {
    const key = keysByName.get(header);
    if (key) return String(raw[key] ?? "").trim();
  }

  return "";
}

export function buildMemberLocationReviewRows({ batch, auditRows, members, locations }) {
  const membersByMembershipWorksId = new Map();
  const membersByEmail = new Map();

  for (const member of members || []) {
    const membershipWorksId = String(
      member.membershipworks_account_id || member.membershipworks_id || ""
    ).trim();
    const email = normalizeEmail(member.email);
    if (membershipWorksId) membersByMembershipWorksId.set(membershipWorksId, member);
    if (email) membersByEmail.set(email, member);
  }

  return (auditRows || [])
    .filter((row) => row.action !== "skip")
    .map((row) => {
      const membershipWorksId = String(
        row.membershipworks_id || row.membershipworks_account_id || ""
      ).trim();
      const member =
        (membershipWorksId && membersByMembershipWorksId.get(membershipWorksId)) ||
        membersByEmail.get(normalizeEmail(row.email)) ||
        null;
      const importedLocation = membershipWorksLocationFromRaw(row.raw_data);

      if (!member) {
        if (!importedLocation) return null;
        return [
          batch?.created_at || "",
          batch?.file_name || "",
          row.row_number ?? "",
          row.action || "",
          "",
          membershipWorksId,
          row.first_name || "",
          row.last_name || "",
          row.email || "",
          importedLocation,
          "",
          "",
          "",
          "Imported member could not be matched to a current member record.",
        ];
      }

      const review = memberImportLocationReview(member, importedLocation, locations);
      if (!review.review) return null;

      return [
        batch?.created_at || "",
        batch?.file_name || "",
        row.row_number ?? "",
        row.action || "",
        member.id || "",
        membershipWorksId,
        member.first_name || row.first_name || "",
        member.last_name || row.last_name || "",
        member.email || row.email || "",
        importedLocation,
        member.club_location || "",
        review.linkedLocation?.name || "",
        member.location_id || "",
        review.reason,
      ];
    })
    .filter(Boolean);
}

export function buildSafeMemberLocationTextUpdates({ auditRows, members, locations }) {
  const membersByMembershipWorksId = new Map();
  const membersByEmail = new Map();
  const importedLocationsByMemberId = new Map();
  const locationsById = new Map(
    (locations || []).map((location) => [String(location.id || ""), location])
  );

  for (const member of members || []) {
    const membershipWorksId = String(
      member.membershipworks_account_id || member.membershipworks_id || ""
    ).trim();
    const email = normalizeEmail(member.email);
    if (membershipWorksId) membersByMembershipWorksId.set(membershipWorksId, member);
    if (email) membersByEmail.set(email, member);
  }

  for (const row of auditRows || []) {
    if (row.action === "skip") continue;

    const membershipWorksId = String(
      row.membershipworks_id || row.membershipworks_account_id || ""
    ).trim();
    const member =
      (membershipWorksId && membersByMembershipWorksId.get(membershipWorksId)) ||
      membersByEmail.get(normalizeEmail(row.email)) ||
      null;
    const importedLocation = membershipWorksLocationFromRaw(row.raw_data);
    if (!member?.id || !importedLocation) continue;

    const memberId = String(member.id);
    if (!importedLocationsByMemberId.has(memberId)) {
      importedLocationsByMemberId.set(memberId, new Set());
    }
    importedLocationsByMemberId.get(memberId).add(normalizeLocationName(importedLocation));
  }

  return (members || []).flatMap((member) => {
    const linkedLocation = locationsById.get(String(member.location_id || ""));
    const linkedName = String(linkedLocation?.name || "").trim();
    const importedNames = importedLocationsByMemberId.get(String(member.id || ""));
    const currentName = String(member.club_location || "").trim();

    if (
      !member.id ||
      !linkedName ||
      !importedNames?.size ||
      importedNames.size !== 1 ||
      !importedNames.has(normalizeLocationName(linkedName)) ||
      currentName === linkedName
    ) {
      return [];
    }

    return [{
      id: member.id,
      club_location: linkedName,
      expectedClubLocation: member.club_location ?? null,
      expectedLocationId: member.location_id,
    }];
  });
}

export function memberLocationReviewCsv(rows) {
  return [LOCATION_REVIEW_CSV_HEADER, ...(rows || [])]
    .map((row) => row.map(csvCell).join(","))
    .join("\r\n");
}

function csvCell(value) {
  let text = String(value ?? "");
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeLocationName(value) {
  return String(value || "").trim().toLowerCase();
}
