export const TEAM_ROSTER_TEAM_COLUMNS = [
  "id",
  "division_id",
  "name",
  "abbreviation",
  "team_number",
  "home_location_id",
  "captain_member_id",
  "co_captain_member_id",
  "co_captain_2_member_id",
  "club_pro_member_id",
  "notes",
  "is_active",
  "created_at",
  "updated_at",
].join(", ");

export function hydrateTeamsForRosterManagement({
  teams = [],
  divisions = [],
  leagues = [],
  locations = [],
  members = [],
  rosterRows = [],
} = {}) {
  const leaguesById = indexById(leagues);
  const locationsById = indexById(locations);
  const membersById = indexById(members);
  const divisionsById = new Map(
    divisions.map((division) => [
      String(division.id),
      {
        ...division,
        leagues: leaguesById.get(String(division.league_id)) || null,
      },
    ])
  );
  const rosterCountByTeamId = new Map();

  for (const row of rosterRows) {
    const teamId = String(row.team_id);
    rosterCountByTeamId.set(teamId, (rosterCountByTeamId.get(teamId) || 0) + 1);
  }

  return teams.map((team) => ({
    ...team,
    divisions: divisionsById.get(String(team.division_id)) || null,
    locations: locationsById.get(String(team.home_location_id)) || null,
    captain: membersById.get(String(team.captain_member_id)) || null,
    co_captain_1: membersById.get(String(team.co_captain_member_id)) || null,
    co_captain_2: membersById.get(String(team.co_captain_2_member_id)) || null,
    club_pro: membersById.get(String(team.club_pro_member_id)) || null,
    roster_count: rosterCountByTeamId.get(String(team.id)) || 0,
  }));
}

export function filterTeamsForRosterManagement(
  teams,
  { includeInactive = false, query = "" } = {}
) {
  const normalizedQuery = query.trim().toLowerCase();
  const sortedTeams = [...teams].sort((a, b) => {
    const leagueCompare = (a.divisions?.leagues?.name || "").localeCompare(
      b.divisions?.leagues?.name || ""
    );

    if (leagueCompare !== 0) return leagueCompare;

    const divisionCompare = (a.divisions?.name || "").localeCompare(
      b.divisions?.name || ""
    );

    if (divisionCompare !== 0) return divisionCompare;

    const nameCompare = (a.name || "").localeCompare(b.name || "");
    if (nameCompare !== 0) return nameCompare;

    return String(a.id || "").localeCompare(String(b.id || ""));
  });

  return sortedTeams.filter((team) => {
    const matchesActiveScope = includeInactive || (
      team.is_active !== false &&
      team.divisions?.is_active !== false &&
      team.divisions?.leagues?.is_active !== false &&
      team.divisions?.leagues?.seasons?.is_active !== false
    );

    if (!matchesActiveScope) return false;
    if (!normalizedQuery) return true;

    const searchText = [
      team.name,
      team.abbreviation,
      team.divisions?.leagues?.name,
      team.divisions?.name,
      team.locations?.name,
      team.is_active === false ? "inactive" : "active",
      memberDisplayName(team.captain),
      memberDisplayName(team.co_captain_1),
      memberDisplayName(team.co_captain_2),
      memberDisplayName(team.club_pro),
    ].join(" ").toLowerCase();

    return searchText.includes(normalizedQuery);
  });
}

export function teamRosterListingCounts(teams, filteredTeams) {
  return {
    shown: filteredTeams.length,
    total: teams.length,
  };
}

function indexById(rows) {
  return new Map(
    rows
      .filter((row) => row?.id != null)
      .map((row) => [String(row.id), row])
  );
}

function memberDisplayName(member) {
  if (!member) return "";
  return (
    `${member.first_name || ""} ${member.last_name || ""}`.trim() ||
    member.full_name ||
    member.email ||
    ""
  );
}
