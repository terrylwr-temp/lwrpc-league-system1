export const TEAM_EXPORT_HEADERS = [
  "Team ID",
  "Team Name",
  "Team Abbreviation",
  "Team Number",
  "Status",
  "Season",
  "Season ID",
  "League",
  "League ID",
  "Rosters Locked",
  "Division",
  "Division ID",
  "Rating Type",
  "Home Location",
  "Location ID",
  "Location Full Address",
  "Location Address",
  "Location City",
  "Location State",
  "Location ZIP Code",
  "Location Courts",
  "Location Court Notes",
  "Captain",
  "Captain Email",
  "Captain Member ID",
  "Co-Captain 1",
  "Co-Captain 1 Email",
  "Co-Captain 1 Member ID",
  "Co-Captain 2",
  "Co-Captain 2 Email",
  "Co-Captain 2 Member ID",
  "Club Pro",
  "Club Pro Email",
  "Club Pro Member ID",
  "Roster Count",
  "Team Notes",
  "Created At",
  "Updated At",
];

export function buildTeamExportRows(teams = []) {
  return teams.map((team) => {
    const league = team?.divisions?.leagues || {};
    const season = league.seasons || {};
    const location = team?.locations || {};

    return [
      team?.id,
      team?.name,
      team?.abbreviation,
      team?.team_number,
      team?.is_active === false ? "Inactive" : "Active",
      season.name,
      season.id || league.season_id,
      league.name,
      league.id,
      league.rosters_locked === true ? "Yes" : "No",
      team?.divisions?.name,
      team?.divisions?.id || team?.division_id,
      team?.divisions?.rating_type,
      location.name,
      location.id || team?.home_location_id,
      locationFullAddress(location),
      location.address,
      location.city,
      location.state,
      location.zip_code,
      location.number_of_courts,
      location.court_notes,
      memberDisplayName(team?.captain),
      team?.captain?.email,
      team?.captain?.id || team?.captain_member_id,
      memberDisplayName(team?.co_captain_1),
      team?.co_captain_1?.email,
      team?.co_captain_1?.id || team?.co_captain_member_id,
      memberDisplayName(team?.co_captain_2),
      team?.co_captain_2?.email,
      team?.co_captain_2?.id || team?.co_captain_2_member_id,
      memberDisplayName(team?.club_pro),
      team?.club_pro?.email,
      team?.club_pro?.id || team?.club_pro_member_id,
      team?.roster_count ?? 0,
      team?.notes,
      team?.created_at,
      team?.updated_at,
    ];
  });
}

export function buildTeamExportCsv(teams = []) {
  return "\uFEFF" + [TEAM_EXPORT_HEADERS, ...buildTeamExportRows(teams)]
    .map((row) => row.map(csvCell).join(","))
    .join("\r\n");
}

export function teamExportFilename(date = new Date()) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `lwrpc-teams-and-rosters-${date.getFullYear()}-${month}-${day}.csv`;
}

function memberDisplayName(member) {
  if (!member) return "";
  return String(
    member.full_name ||
    [member.first_name, member.last_name].filter(Boolean).join(" ")
  ).trim();
}

function locationFullAddress(location) {
  const locality = [location?.city, location?.state].filter(Boolean).join(", ");
  const localityWithZip = [locality, location?.zip_code].filter(Boolean).join(" ");
  return [location?.address, localityWithZip].filter(Boolean).join(", ");
}

function csvCell(value) {
  let text = String(value ?? "");
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}
