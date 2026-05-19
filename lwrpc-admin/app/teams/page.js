"use client";

import LoadingScreen from "../components/LoadingScreen";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppHeader from "../components/AppHeader";
import { requireRole, supabase } from "../lib/auth";

export default function TeamsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  const [leagues, setLeagues] = useState([]);
  const [divisions, setDivisions] = useState([]);
  const [locations, setLocations] = useState([]);
  const [members, setMembers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [teamSearch, setTeamSearch] = useState("");

  const [editingTeamId, setEditingTeamId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const [teamName, setTeamName] = useState("");
  const [abbreviation, setAbbreviation] = useState("");
  const [selectedLeague, setSelectedLeague] = useState("");
  const [selectedDivision, setSelectedDivision] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("");
  const [captainId, setCaptainId] = useState("");
  const [coCaptain1Id, setCoCaptain1Id] = useState("");
  const [coCaptain2Id, setCoCaptain2Id] = useState("");
  const [notes, setNotes] = useState("");

  const filteredDivisions = useMemo(() => {
    if (!selectedLeague) return [];
    return divisions.filter(d => d.league_id === selectedLeague);
  }, [divisions, selectedLeague]);

  const filteredMembers = useMemo(() => {
    if (!selectedLocation) return [];

    return members
      .filter(member => String(member.location_id) === String(selectedLocation))
      .sort((a, b) => memberName(a).localeCompare(memberName(b)));
  }, [members, selectedLocation]);

  const filteredTeams = useMemo(() => {
    const q = teamSearch.trim().toLowerCase();
    const sortedTeams = [...teams].sort((a, b) => {
      const leagueCompare = (a.divisions?.leagues?.name || "").localeCompare(
        b.divisions?.leagues?.name || ""
      );

      if (leagueCompare !== 0) return leagueCompare;

      const divisionCompare = (a.divisions?.name || "").localeCompare(
        b.divisions?.name || ""
      );

      if (divisionCompare !== 0) return divisionCompare;

      return (a.name || "").localeCompare(b.name || "");
    });

    if (!q) return sortedTeams;

    return sortedTeams.filter((team) => {
      const searchText = [
        team.name,
        team.abbreviation,
        team.divisions?.leagues?.name,
        team.divisions?.name,
        team.locations?.name,
        displayMemberName(team.captain),
        displayMemberName(team.co_captain_1),
        displayMemberName(team.co_captain_2),
      ].join(" ").toLowerCase();

      return searchText.includes(q);
    });
  }, [teams, teamSearch]);

  const groupedTeams = useMemo(() => {
    const groups = [];
    const groupMap = {};

    filteredTeams.forEach((team) => {
      const leagueName = team.divisions?.leagues?.name || "No League";
      const divisionName = team.divisions?.name || "No Division";
      const groupKey = `${leagueName}::${divisionName}`;

      if (!groupMap[groupKey]) {
        groupMap[groupKey] = {
          key: groupKey,
          leagueName,
          divisionName,
          teams: [],
        };
        groups.push(groupMap[groupKey]);
      }

      groupMap[groupKey].teams.push(team);
    });

    return groups;
  }, [filteredTeams]);

  async function checkAuth() {
    const user = await requireRole(router, "captain");
    return !!user;
  }

  async function loadData() {
    const { data: leagueData } = await supabase
      .from("leagues")
      .select("id, name")
      .order("name", { ascending: true });

    const { data: divisionData } = await supabase
      .from("divisions")
      .select("id, name, league_id")
      .order("name", { ascending: true });

    const { data: locationData } = await supabase
      .from("locations")
      .select("id, name")
      .order("name", { ascending: true });

    const { data: memberData } = await supabase
      .from("members")
      .select(`
        id,
        full_name,
        first_name,
        last_name,
        email,
        self_rating,
        dupr_id,
        location_id
      `)
      .order("last_name", { ascending: true })
      .range(0, 2500);

    const { data: teamData } = await supabase
      .from("teams")
      .select(`
        *,
        divisions (
          id,
          name,
          league_id,
          leagues (
            id,
            name
          )
        ),
        locations (
          id,
          name
        ),
        captain:members!teams_captain_member_id_fkey (
          id,
          full_name,
          first_name,
          last_name,
          email
        ),
        co_captain_1:members!teams_co_captain_member_id_fkey (
          id,
          full_name,
          first_name,
          last_name,
          email
        ),
        co_captain_2:members!teams_co_captain_2_member_id_fkey (
          id,
          full_name,
          first_name,
          last_name,
          email
        )
      `)
      .order("name", { ascending: true });

    setLeagues(leagueData || []);
    setDivisions(divisionData || []);
    setLocations(locationData || []);
    setMembers(memberData || []);
    setTeams(teamData || []);
    setLoading(false);
  }

  async function upgradeMemberToCaptain(memberId) {
    if (!memberId) return;

    const { data: existingRole } = await supabase
      .from("user_roles")
      .select("*")
      .eq("member_id", memberId)
      .maybeSingle();

    const roleRank = {
      player: 1,
      captain: 2,
      club_pro: 3,
      league_manager: 4,
      commissioner: 5
    };

    if (existingRole) {
      const currentRank = roleRank[existingRole.role] || 1;

      if (currentRank < roleRank.captain) {
        await supabase
          .from("user_roles")
          .update({
            role: "captain",
            updated_at: new Date().toISOString()
          })
          .eq("id", existingRole.id);
      }

      return;
    }

    await supabase
      .from("user_roles")
      .insert({
        user_id: null,
        member_id: memberId,
        role: "captain"
      });
  }

  async function saveTeam(e) {
    e.preventDefault();

    if (!teamName || !selectedDivision) {
      alert("Team name and division are required");
      return;
    }

    setIsSaving(true);

    const payload = {
      name: teamName,
      abbreviation: abbreviation || null,
      division_id: selectedDivision,
      home_location_id: selectedLocation || null,
      captain_member_id: captainId || null,
      co_captain_member_id: coCaptain1Id || null,
      co_captain_2_member_id: coCaptain2Id || null,
      notes: notes || null,
      updated_at: new Date().toISOString()
    };

    let error = null;

    if (editingTeamId) {
      const result = await supabase
        .from("teams")
        .update(payload)
        .eq("id", editingTeamId);

      error = result.error;
    } else {
      const result = await supabase
        .from("teams")
        .insert(payload);

      error = result.error;
    }

    if (error) {
      alert(error.message);
      setIsSaving(false);
      return;
    }

    await upgradeMemberToCaptain(captainId);
    await upgradeMemberToCaptain(coCaptain1Id);
    await upgradeMemberToCaptain(coCaptain2Id);

    resetForm();
    await loadData();

    setIsSaving(false);
  }

  function resetForm() {
    setEditingTeamId(null);
    setTeamName("");
    setAbbreviation("");
    setSelectedLeague("");
    setSelectedDivision("");
    setSelectedLocation("");
    setCaptainId("");
    setCoCaptain1Id("");
    setCoCaptain2Id("");
    setNotes("");
  }

  function editTeam(team) {
    setEditingTeamId(team.id);

    setTeamName(team.name || "");
    setAbbreviation(team.abbreviation || "");

    const leagueId =
      team.divisions?.league_id ||
      divisions.find(d => d.id === team.division_id)?.league_id ||
      "";

    setSelectedLeague(leagueId);
    setSelectedDivision(team.division_id || "");
    setSelectedLocation(team.home_location_id || "");
    setCaptainId(team.captain_member_id || "");
    setCoCaptain1Id(team.co_captain_member_id || "");
    setCoCaptain2Id(team.co_captain_2_member_id || "");
    setNotes(team.notes || "");

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  }

  async function deleteTeam(team) {
    const ok = confirm(
      `Delete team "${team.name}"? This may also remove related roster and match references depending on your database rules.`
    );

    if (!ok) return;

    const { error } = await supabase
      .from("teams")
      .delete()
      .eq("id", team.id);

    if (error) {
      alert(error.message);
      return;
    }

    if (editingTeamId === team.id) {
      resetForm();
    }

    loadData();
  }

  useEffect(() => {
    async function run() {
      const ok = await checkAuth();

      if (ok) {
        loadData();
      }
    }

    run();
  }, []);

  function memberName(member) {
    return (
      member.full_name ||
      `${member.first_name || ""} ${member.last_name || ""}`.trim() ||
      member.email ||
      "Unnamed Member"
    );
  }

  function displayMemberName(member) {
    if (!member) return "";

    return (
      member.full_name ||
      `${member.first_name || ""} ${member.last_name || ""}`.trim() ||
      member.email ||
      "Unnamed Member"
    );
  }

  function captainSummary(team) {
    const names = [
      displayMemberName(team.captain),
      displayMemberName(team.co_captain_1),
      displayMemberName(team.co_captain_2),
    ].filter(Boolean);

    return names.join(", ");
  }

if (loading) {
  return <LoadingScreen subtitle="Loading Teams & Rosters..." />;
}

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-7xl">

        <AppHeader
          title="Teams & Rosters"
          subtitle="Create teams, edit team information, assign captains, and manage rosters."
        />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

          <div className="rounded-2xl bg-white p-6 shadow">

            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">
                {editingTeamId ? "Edit Team" : "Create Team"}
              </h2>

              {editingTeamId && (
                <div className="rounded-xl bg-blue-100 px-3 py-2 text-xs font-bold uppercase tracking-wide text-blue-900">
                  Editing
                </div>
              )}
            </div>

            <form onSubmit={saveTeam} className="space-y-4">

              <Field
                label="Team Name"
                hint="The public team name shown on schedules, standings, and roster pages."
              >
                <input
                  className="w-full rounded-xl border border-slate-300 px-4 py-3"
                  placeholder="Example: Lakewood Ranch Aces"
                  value={teamName}
                  onChange={e => setTeamName(e.target.value)}
                />
              </Field>

              <Field
                label="Team Abbreviation"
                hint="Optional short name for compact schedule and standings displays."
              >
                <input
                  className="w-full rounded-xl border border-slate-300 px-4 py-3"
                  placeholder="Example: LWR-A"
                  value={abbreviation}
                  onChange={e => setAbbreviation(e.target.value)}
                />
              </Field>

              <Field
                label="League"
                hint="Choose the league first so the division list can be narrowed."
              >
                <select
                  className="w-full rounded-xl border border-slate-300 px-4 py-3"
                  value={selectedLeague}
                  onChange={e => {
                    setSelectedLeague(e.target.value);
                    setSelectedDivision("");
                  }}
                >
                  <option value="">Select League</option>

                  {leagues.map(league => (
                    <option key={league.id} value={league.id}>
                      {league.name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field
                label="Division"
                hint="The team will compete in this division."
              >
                <select
                  className="w-full rounded-xl border border-slate-300 px-4 py-3"
                  value={selectedDivision}
                  onChange={e => setSelectedDivision(e.target.value)}
                  disabled={!selectedLeague}
                >
                  <option value="">
                    {selectedLeague ? "Select Division" : "Select League First"}
                  </option>

                  {filteredDivisions.map(division => (
                    <option key={division.id} value={division.id}>
                      {division.name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field
                label="Home Location"
                hint="Used for home matches and to filter captain choices."
              >
                <select
                  className="w-full rounded-xl border border-slate-300 px-4 py-3"
                  value={selectedLocation}
                  onChange={e => {
                    setSelectedLocation(e.target.value);
                    setCaptainId("");
                    setCoCaptain1Id("");
                    setCoCaptain2Id("");
                  }}
                >
                  <option value="">Select Home Location</option>

                  {locations.map(location => (
                    <option key={location.id} value={location.id}>
                      {location.name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field
                label="Captain"
                hint="Captain choices are filtered to members assigned to the selected home location."
              >
                <select
                  className="w-full rounded-xl border border-slate-300 px-4 py-3"
                  value={captainId}
                  onChange={e => setCaptainId(e.target.value)}
                  disabled={!selectedLocation}
                >
                  <option value="">
                    {selectedLocation ? "Select Captain" : "Select Location First"}
                  </option>

                  {filteredMembers.map(member => (
                    <option key={member.id} value={member.id}>
                      {memberName(member)}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Co-Captain 1" hint="Optional backup captain for team administration.">
                <select
                  className="w-full rounded-xl border border-slate-300 px-4 py-3"
                  value={coCaptain1Id}
                  onChange={e => setCoCaptain1Id(e.target.value)}
                  disabled={!selectedLocation}
                >
                  <option value="">
                    {selectedLocation ? "Select Co-Captain 1" : "Select Location First"}
                  </option>

                  {filteredMembers.map(member => (
                    <option key={member.id} value={member.id}>
                      {memberName(member)}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Co-Captain 2" hint="Optional second backup captain.">
                <select
                  className="w-full rounded-xl border border-slate-300 px-4 py-3"
                  value={coCaptain2Id}
                  onChange={e => setCoCaptain2Id(e.target.value)}
                  disabled={!selectedLocation}
                >
                  <option value="">
                    {selectedLocation ? "Select Co-Captain 2" : "Select Location First"}
                  </option>

                  {filteredMembers.map(member => (
                    <option key={member.id} value={member.id}>
                      {memberName(member)}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Team Notes" hint="Optional internal notes about this team.">
                <textarea
                  className="w-full rounded-xl border border-slate-300 px-4 py-3"
                  placeholder="Notes"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                />
              </Field>

              <div className="space-y-3">

                <button
                  type="submit"
                  disabled={isSaving}
                  className="w-full rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
                >
                  {isSaving
                    ? "Saving..."
                    : editingTeamId
                      ? "Save Team Changes"
                      : "Create Team"}
                </button>

                {editingTeamId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="w-full rounded-xl bg-slate-200 px-5 py-3 font-semibold text-slate-900 hover:bg-slate-300"
                  >
                    Cancel Edit
                  </button>
                )}

              </div>

            </form>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow lg:col-span-2">
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <h2 className="text-xl font-bold text-slate-900">
                Teams
              </h2>

              <div className="flex flex-wrap items-center gap-2">
                <input
                  value={teamSearch}
                  onChange={(e) => setTeamSearch(e.target.value)}
                  placeholder="Filter teams, leagues, divisions, captains..."
                  className="min-w-72 rounded-xl border border-slate-300 px-4 py-3"
                />

                {teamSearch && (
                  <button
                    type="button"
                    onClick={() => setTeamSearch("")}
                    className="rounded-xl bg-slate-200 px-4 py-3 font-semibold text-slate-800 hover:bg-slate-300"
                  >
                    Clear
                  </button>
                )}

                <div className="rounded-xl bg-slate-900 px-5 py-3 text-white">
                  <div className="text-xs uppercase tracking-wide text-slate-300">
                    Teams
                  </div>

                  <div className="text-2xl font-bold">
                    {filteredTeams.length}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3">

              {groupedTeams.map(group => (
                <div key={group.key} className="overflow-hidden rounded-xl border border-slate-200">
                  <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-900 px-4 py-2 text-white">
                    <div className="min-w-0">
                      <div className="truncate text-xs font-semibold uppercase tracking-wide text-blue-200">
                        {group.leagueName}
                      </div>
                      <div className="truncate text-base font-bold">
                        {group.divisionName}
                      </div>
                    </div>

                    <div className="rounded-lg bg-white/10 px-3 py-1 text-sm font-bold">
                      {group.teams.length} team{group.teams.length === 1 ? "" : "s"}
                    </div>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {group.teams.map(team => (
                      <div
                        key={team.id}
                        className={`grid grid-cols-1 gap-2 px-4 py-2 text-sm md:grid-cols-[minmax(160px,1.2fr)_minmax(120px,0.8fr)_minmax(180px,1fr)_auto] md:items-center ${
                          editingTeamId === team.id
                            ? "bg-blue-50"
                            : "bg-white hover:bg-slate-50"
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="truncate font-bold text-slate-900">
                            {team.name}
                            {team.abbreviation ? ` (${team.abbreviation})` : ""}
                          </div>
                          {team.notes && (
                            <div className="truncate text-xs text-slate-500">
                              {team.notes}
                            </div>
                          )}
                        </div>

                        <div className="truncate text-slate-700">
                          {team.locations?.name || ""}
                        </div>

                        <div className="truncate text-slate-700">
                          <span className="font-semibold text-slate-900">Captains:</span>{" "}
                          {captainSummary(team)}
                        </div>

                        <div className="flex flex-wrap gap-2 md:justify-end">
                          <button
                            onClick={() => editTeam(team)}
                            className="rounded-lg bg-blue-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-800"
                          >
                            Edit
                          </button>

                          <button
                            onClick={() => router.push(`/teams/${team.id}`)}
                            className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
                          >
                            Roster
                          </button>

                          <button
                            onClick={() => deleteTeam(team)}
                            className="rounded-lg bg-red-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-800"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {filteredTeams.length === 0 && (
                <div className="text-slate-500">
                  {teams.length === 0 ? "No teams created yet." : "No teams match the current filter."}
                </div>
              )}

            </div>
          </div>

        </div>
      </div>
    </main>
  );
}

function Field({ label, hint, children }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-semibold text-slate-700">
        {label}
      </label>
      {children}
      {hint && (
        <p className="mt-1 text-xs text-slate-500">
          {hint}
        </p>
      )}
    </div>
  );
}

