export function specialRequestMemberLabel(member) {
  if (!member) return "";
  const name = String(member.full_name || `${member.first_name || ""} ${member.last_name || ""}`).trim();
  return name || member.email || "Unknown Member";
}

export function filterSpecialRequestMembers(members, search, limit = 50) {
  const query = String(search || "").trim().toLowerCase();
  return [...(members || [])]
    .filter((member) => {
      if (!query) return true;
      return [specialRequestMemberLabel(member), member.email]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    })
    .sort((a, b) => specialRequestMemberLabel(a).localeCompare(specialRequestMemberLabel(b)))
    .slice(0, limit);
}

export function specialRequestTeamsForDivision(teams, divisionId) {
  return [...(teams || [])]
    .filter((team) => team.is_active !== false)
    .filter((team) => !divisionId || String(team.division_id) === String(divisionId))
    .sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
}

export function buildSpecialRequestPayload(form, teams = []) {
  const memberId = String(form.memberId || "").trim();
  const requestDate = String(form.requestDate || "").trim();
  const requestText = String(form.requestText || "").trim();
  const divisionId = String(form.divisionId || "").trim();
  const teamId = String(form.teamId || "").trim();

  if (!memberId) throw new Error("Select the member requesting this scheduling change.");
  if (!requestDate) throw new Error("Request date is required.");
  if (!requestText) throw new Error("Request details are required.");
  if (requestText.length > 5000) throw new Error("Request details must be 5,000 characters or fewer.");

  if (divisionId && teamId) {
    const team = teams.find((row) => String(row.id) === teamId);
    if (!team || String(team.division_id) !== divisionId) {
      throw new Error("The selected team does not belong to the selected division.");
    }
  }

  return {
    location_id: String(form.locationId || "").trim() || null,
    member_id: memberId,
    request_date: requestDate,
    division_id: divisionId || null,
    team_id: teamId || null,
    request_text: requestText,
  };
}

export function filterAndSortSpecialRequests(rows, filters = {}, today = new Date().toISOString().slice(0, 10)) {
  const filtered = (rows || []).filter((row) => {
    if (filters.locationId && String(row.location_id || "") !== String(filters.locationId)) return false;
    if (filters.divisionId && String(row.division_id || "") !== String(filters.divisionId)) return false;
    if (filters.teamId && String(row.team_id || "") !== String(filters.teamId)) return false;
    if (filters.requestDate && String(row.request_date || "") !== String(filters.requestDate)) return false;
    return true;
  });

  return [...filtered].sort((a, b) => {
    const aDate = String(a.request_date || "9999-12-31");
    const bDate = String(b.request_date || "9999-12-31");
    const aUpcoming = aDate >= today;
    const bUpcoming = bDate >= today;
    if (aUpcoming !== bUpcoming) return aUpcoming ? -1 : 1;
    return aUpcoming ? aDate.localeCompare(bDate) : bDate.localeCompare(aDate);
  });
}
