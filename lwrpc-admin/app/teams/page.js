"use client";

import LoadingScreen from "../components/LoadingScreen";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppHeader from "../components/AppHeader";
import { requireRole, supabase } from "../lib/auth";
import { confirmDeleteAction } from "../lib/confirmDelete";
import TeamScheduleModal from "../components/TeamScheduleModal";
import { confirmUnsavedChanges, useUnsavedChangesWarning } from "../lib/useUnsavedChangesWarning";

export default function TeamsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  const [leagues, setLeagues] = useState([]);
  const [divisions, setDivisions] = useState([]);
  const [locations, setLocations] = useState([]);
  const [members, setMembers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [teamSearch, setTeamSearch] = useState("");
  const [expandedGroupKeys, setExpandedGroupKeys] = useState([]);
  const [scheduleTeam, setScheduleTeam] = useState(null);
  const [scheduleTeams, setScheduleTeams] = useState([]);
  const [scheduleMatches, setScheduleMatches] = useState([]);
  const [scheduleByes, setScheduleByes] = useState([]);
  const [scheduleRatings, setScheduleRatings] = useState([]);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [copyTeam, setCopyTeam] = useState(null);
  const [copyTeamName, setCopyTeamName] = useState("");
  const [copyTargetLeague, setCopyTargetLeague] = useState("");
  const [copyTargetDivision, setCopyTargetDivision] = useState("");
  const [copyRoster, setCopyRoster] = useState(true);
  const [copyingTeam, setCopyingTeam] = useState(false);

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
  const [clubProId, setClubProId] = useState("");
  const [teamActive, setTeamActive] = useState(true);
  const [showAllCaptainCommunities, setShowAllCaptainCommunities] = useState(false);
  const [notes, setNotes] = useState("");

  useUnsavedChangesWarning(
    Boolean(editingTeamId || teamName.trim() || abbreviation.trim() || selectedLeague || selectedDivision || selectedLocation || captainId || coCaptain1Id || coCaptain2Id || clubProId || !teamActive || showAllCaptainCommunities || notes.trim()),
    "team"
  );

  const activeLeagues = useMemo(() => {
    return leagues.filter((league) => league.is_active !== false && league.seasons?.is_active !== false);
  }, [leagues]);

  const activeLeagueIds = useMemo(() => {
    return new Set(activeLeagues.map((league) => String(league.id)));
  }, [activeLeagues]);

  const filteredDivisions = useMemo(() => {
    if (!selectedLeague) return [];
    if (!activeLeagueIds.has(String(selectedLeague))) return [];
    return divisions.filter(d => d.league_id === selectedLeague && d.is_active !== false);
  }, [activeLeagueIds, divisions, selectedLeague]);

  const copyTargetDivisions = useMemo(() => {
    if (!copyTargetLeague) return [];
    if (!activeLeagueIds.has(String(copyTargetLeague))) return [];
    return divisions.filter((division) => division.league_id === copyTargetLeague && division.is_active !== false);
  }, [activeLeagueIds, copyTargetLeague, divisions]);

  const captainMemberChoices = useMemo(() => {
    const selectedCaptainIds = [captainId, coCaptain1Id, coCaptain2Id, clubProId]
      .filter(Boolean)
      .map(String);

    return members
      .filter((member) => {
        if (showAllCaptainCommunities) return true;
        if (selectedCaptainIds.includes(String(member.id))) return true;
        if (!selectedLocation) return false;

        return String(member.location_id) === String(selectedLocation);
      })
      .sort((a, b) => memberBaseName(a).localeCompare(memberBaseName(b)));
  }, [captainId, clubProId, coCaptain1Id, coCaptain2Id, members, selectedLocation, showAllCaptainCommunities]);

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
        team.is_active === false ? "inactive" : "active",
        displayMemberName(team.captain),
        displayMemberName(team.co_captain_1),
        displayMemberName(team.co_captain_2),
        displayMemberName(team.club_pro),
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

  const checkAuth = useCallback(async function checkAuth() {
    const user = await requireRole(router, "captain");
    return !!user;
  }, [router]);

  const loadData = useCallback(async function loadData() {
    const { data: leagueData } = await supabase
      .from("leagues")
      .select(`
        id,
        name,
        is_active,
        seasons (
          id,
          name,
          is_active
        )
      `)
      .order("name", { ascending: true });

    const { data: divisionData } = await supabase
      .from("divisions")
      .select("id, name, league_id, is_active")
      .order("name", { ascending: true });

    const { data: locationData } = await supabase
      .from("locations")
      .select("id, name")
      .order("name", { ascending: true });

    const { data: memberData, error: memberError } = await supabase
      .from("members")
      .select(`
        id,
        full_name,
        first_name,
        last_name,
        email,
        self_rating,
        dupr_id,
        is_active_member,
        location_id,
        club_location
      `)
      .or("is_active_member.eq.true,is_active_member.is.null")
      .order("last_name", { ascending: true })
      .range(0, 2500);

    if (memberError) {
      alert(memberError.message);
      setLoading(false);
      return;
    }

    const { data: teamData } = await supabase
      .from("teams")
      .select(`
        *,
        divisions (
          id,
          name,
          league_id,
          rating_type,
          leagues (
            id,
            name,
            season_id
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
        ),
        club_pro:members!teams_club_pro_member_id_fkey (
          id,
          full_name,
          first_name,
          last_name,
          email
        )
      `)
      .order("name", { ascending: true });

    const { rows: rosterRows, error: rosterError } = await loadAllRosterRows();

    if (rosterError) {
      alert(rosterError.message);
      setLoading(false);
      return;
    }

    const rosterCountByTeamId = (rosterRows || []).reduce((counts, row) => {
      counts[row.team_id] = (counts[row.team_id] || 0) + 1;
      return counts;
    }, {});

    setLeagues(leagueData || []);
    setDivisions(divisionData || []);
    setLocations(locationData || []);
    setMembers(memberData || []);
    setTeams(
      (teamData || []).map((team) => ({
        ...team,
        roster_count: rosterCountByTeamId[team.id] || 0,
      }))
    );
    setLoading(false);
  }, []);

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

  async function upgradeMemberToClubPro(memberId) {
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

      if (currentRank < roleRank.club_pro) {
        await supabase
          .from("user_roles")
          .update({
            role: "club_pro",
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
        role: "club_pro"
      });
  }

  async function saveTeam(e) {
    e.preventDefault();

    if (!teamName || !selectedLeague || !selectedDivision || !selectedLocation || !captainId) {
      alert("Team Name, League, Division, Home Location, and Captain are required.");
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
      club_pro_member_id: clubProId || null,
      notes: notes || null,
      is_active: teamActive,
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
    await upgradeMemberToClubPro(clubProId);

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
    setClubProId("");
    setTeamActive(true);
    setShowAllCaptainCommunities(false);
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
    setClubProId(team.club_pro_member_id || "");
    setTeamActive(team.is_active !== false);
    setShowAllCaptainCommunities(
      captainIsOutsideHomeLocation(team.captain_member_id, team.home_location_id) ||
      captainIsOutsideHomeLocation(team.co_captain_member_id, team.home_location_id) ||
      captainIsOutsideHomeLocation(team.co_captain_2_member_id, team.home_location_id) ||
      captainIsOutsideHomeLocation(team.club_pro_member_id, team.home_location_id)
    );
    setNotes(team.notes || "");

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  }

  async function deleteTeam(team) {
    const ok = confirmDeleteAction({
      title: `Delete team "${team.name}"?`,
      details: "This may delete or orphan roster records, schedule entries, matches, scores, standings, and captain assignments depending on database relationships. If the team is used by matches, the database may reject the delete.",
    });

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

  async function toggleTeamActive(team) {
    const currentlyActive = team.is_active !== false;

    if (currentlyActive) {
      const ok = confirm([
        `Inactivate team "${team.name}"?`,
        "",
        "This will mark the team inactive and reset its standings record to 0.",
        "Historical matches, scores, roster history, and player history will not be deleted.",
      ].join("\n"));

      if (!ok) return;
    }

    const { error } = await supabase
      .from("teams")
      .update({
        is_active: !currentlyActive,
        updated_at: new Date().toISOString(),
      })
      .eq("id", team.id);

    if (error) {
      alert(error.message);
      return;
    }

    if (currentlyActive) {
      const resetError = await resetTeamStanding(team.id);
      if (resetError) {
        alert(resetError.message);
        return;
      }
    }

    loadData();
  }

  async function resetTeamStanding(teamId) {
    const { error } = await supabase
      .from("team_standings")
      .update({
        rank: null,
        matches_played: 0,
        match_wins: 0,
        match_losses: 0,
        match_ties: 0,
        line_wins: 0,
        line_losses: 0,
        line_ties: 0,
        game_wins: 0,
        game_losses: 0,
        points_for: 0,
        points_against: 0,
        point_differential: 0,
        standings_points: 0,
        home_wins: 0,
        home_losses: 0,
        away_wins: 0,
        away_losses: 0,
        recent_form: "",
        current_streak: "-",
        updated_at: new Date().toISOString(),
      })
      .eq("team_id", teamId);

    return error;
  }

  function openCopyTeam(team) {
    setCopyTeam(team);
    setCopyTeamName(team.name || "");
    setCopyTargetLeague("");
    setCopyTargetDivision("");
    setCopyRoster(true);
  }

  function closeCopyTeam() {
    if (copyingTeam) return;
    setCopyTeam(null);
    setCopyTeamName("");
    setCopyTargetLeague("");
    setCopyTargetDivision("");
    setCopyRoster(true);
  }

  async function copyTeamToDivision() {
    if (!copyTeam) return;

    if (!copyTeamName.trim() || !copyTargetLeague || !copyTargetDivision) {
      alert("Team name, target league, and target division are required.");
      return;
    }

    setCopyingTeam(true);

    const payload = copyTeamPayload(copyTeam, copyTeamName.trim(), copyTargetDivision);
    const { data: createdTeam, error: teamError } = await supabase
      .from("teams")
      .insert(payload)
      .select("id")
      .single();

    if (teamError) {
      alert(teamError.message);
      setCopyingTeam(false);
      return;
    }

    if (copyRoster) {
      const { data: rosterRows, error: rosterLoadError } = await supabase
        .from("team_members")
        .select("*")
        .eq("team_id", copyTeam.id);

      if (rosterLoadError) {
        alert(rosterLoadError.message);
        setCopyingTeam(false);
        return;
      }

      const rosterPayload = (rosterRows || []).map((row) =>
        copyRosterPayload(row, createdTeam.id)
      );

      if (rosterPayload.length > 0) {
        const { error: rosterCopyError } = await supabase
          .from("team_members")
          .insert(rosterPayload);

        if (rosterCopyError) {
          alert(rosterCopyError.message);
          setCopyingTeam(false);
          return;
        }
      }
    }

    await upgradeMemberToCaptain(payload.captain_member_id);
    await upgradeMemberToCaptain(payload.co_captain_member_id);
    await upgradeMemberToCaptain(payload.co_captain_2_member_id);
    await upgradeMemberToClubPro(payload.club_pro_member_id);

    setCopyTeam(null);
    setCopyTeamName("");
    setCopyTargetLeague("");
    setCopyTargetDivision("");
    setCopyRoster(true);
    await loadData();
    setCopyingTeam(false);
  }

  async function openTeamSchedule(team) {
    setScheduleTeam(team);
    setScheduleTeams([]);
    setScheduleMatches([]);
    setScheduleByes([]);
    setScheduleRatings([]);
    setScheduleLoading(true);

    const seasonId = team.divisions?.leagues?.season_id;
    const [
      { data: divisionTeams, error: teamsError },
      { data: divisionMatches, error: matchesError },
      { data: divisionByes, error: byesError },
      { data: divisionStandings, error: standingsError },
      { data: divisionRatings, error: ratingsError },
    ] = await Promise.all([
      supabase
        .from("teams")
        .select("id, name, division_id, is_active, locations(id, name)")
        .eq("division_id", team.division_id)
        .neq("is_active", false)
        .order("name", { ascending: true }),
      supabase
        .from("matches")
        .select(`
          id,
          league_id,
          division_id,
          home_team_id,
          away_team_id,
          location_id,
          scheduled_date,
          scheduled_time,
          week_number,
          status,
          score_status,
          score_entered_at,
          score_verified_at,
          home_score,
          away_score,
          winning_team_id,
          is_published,
          locations ( id, name ),
          home_team:teams!matches_home_team_id_fkey ( id, name ),
          away_team:teams!matches_away_team_id_fkey ( id, name ),
          match_lines (
            id,
            line_number,
            home_team_games_won,
            away_team_games_won,
            division_lines ( line_name ),
            home_player_1:members!match_lines_home_player_1_id_fkey(id, first_name, last_name, self_rating),
            home_player_2:members!match_lines_home_player_2_id_fkey(id, first_name, last_name, self_rating),
            away_player_1:members!match_lines_away_player_1_id_fkey(id, first_name, last_name, self_rating),
            away_player_2:members!match_lines_away_player_2_id_fkey(id, first_name, last_name, self_rating),
            line_games ( id, game_number, home_score, away_score, game_status )
          )
        `)
        .eq("division_id", team.division_id)
        .eq("is_published", true)
        .order("scheduled_date", { ascending: true })
        .order("scheduled_time", { ascending: true }),
      supabase
        .from("team_byes")
        .select(`
          *,
          teams ( id, name ),
          divisions ( id, name )
        `)
        .eq("division_id", team.division_id)
        .order("bye_date", { ascending: true }),
      supabase
        .from("team_standings")
        .select("team_id, rank, standings_points, match_wins, match_losses, match_ties")
        .eq("division_id", team.division_id),
      seasonId
        ? supabase
            .from("member_season_ratings")
            .select("member_id, season_dupr_rating, season_primetime_rating")
            .eq("season_id", seasonId)
        : Promise.resolve({ data: [], error: null }),
    ]);

    setScheduleLoading(false);

    const firstError = teamsError || matchesError || byesError || standingsError || ratingsError;
    if (firstError) {
      alert(firstError.message);
      return;
    }

    const standingsByTeamId = Object.fromEntries(
      (divisionStandings || []).map((standing) => [String(standing.team_id), standing])
    );

    setScheduleTeams(
      (divisionTeams || [])
        .map((divisionTeam) => ({
          ...divisionTeam,
          standing: standingsByTeamId[String(divisionTeam.id)] || null,
        }))
        .sort(compareScheduleTeams)
    );
    setScheduleMatches(divisionMatches || []);
    setScheduleByes(filterByesForPublishedSchedule(divisionByes || [], divisionMatches || []));
    setScheduleRatings(divisionRatings || []);
  }

  useEffect(() => {
    async function run() {
      const ok = await checkAuth();

      if (ok) {
        loadData();
      }
    }

    run();
  }, [checkAuth, loadData]);

  function memberName(member) {
    const name = memberBaseName(member);
    const locationName = member.club_location;

    return showAllCaptainCommunities && locationName
      ? `${name} - ${locationName}`
      : name;
  }

  function displayMemberName(member) {
    if (!member) return "";

    return (
      `${member.first_name || ""} ${member.last_name || ""}`.trim() ||
      member.full_name ||
      member.email ||
      "Unnamed Member"
    );
  }

  function captainIsOutsideHomeLocation(memberId, homeLocationId) {
    if (!memberId || !homeLocationId) return false;

    const member = members.find((item) => String(item.id) === String(memberId));

    if (!member?.location_id) return false;

    return String(member.location_id) !== String(homeLocationId);
  }

  function captainSummary(team) {
    const names = [
      displayMemberName(team.captain),
      displayMemberName(team.co_captain_1),
      displayMemberName(team.co_captain_2),
      displayMemberName(team.club_pro),
    ].filter(Boolean);

    return names.join(", ");
  }

  function toggleGroup(groupKey) {
    setExpandedGroupKeys((current) =>
      current.includes(groupKey)
        ? current.filter((key) => key !== groupKey)
        : [...current, groupKey]
    );
  }

  function expandAllGroups() {
    setExpandedGroupKeys(groupedTeams.map((group) => group.key));
  }

  function collapseAllGroups() {
    setExpandedGroupKeys([]);
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

                  {activeLeagues.map(league => (
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

              <label className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={showAllCaptainCommunities}
                  onChange={(e) => setShowAllCaptainCommunities(e.target.checked)}
                  className="mt-1"
                />
                <span>
                  <span className="font-semibold text-slate-900">Allow captain selection from any community</span>
                  <span className="block text-xs text-slate-500">
                    Use this when a captain or co-captain belongs to a different community than the home location.
                  </span>
                </span>
              </label>

              <label className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={teamActive}
                  onChange={(e) => setTeamActive(e.target.checked)}
                  className="mt-1"
                />
                <span>
                  <span className="font-semibold text-slate-900">Team is active</span>
                  <span className="block text-xs text-slate-500">
                    Inactive teams are kept for history but can be excluded from current-season operations over time.
                  </span>
                </span>
              </label>

              <Field
                label="Captain"
                hint={showAllCaptainCommunities ? "Showing members from all communities." : "Captain choices are filtered to members assigned to the selected home location."}
              >
                <select
                  className="w-full rounded-xl border border-slate-300 px-4 py-3"
                  value={captainId}
                  onChange={e => setCaptainId(e.target.value)}
                  disabled={!selectedLocation && !showAllCaptainCommunities}
                >
                  <option value="">
                    {selectedLocation || showAllCaptainCommunities ? "Select Captain" : "Select Location First"}
                  </option>

                  {captainMemberChoices.map(member => (
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
                  disabled={!selectedLocation && !showAllCaptainCommunities}
                >
                  <option value="">
                    {selectedLocation || showAllCaptainCommunities ? "Select Co-Captain 1" : "Select Location First"}
                  </option>

                  {captainMemberChoices.map(member => (
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
                  disabled={!selectedLocation && !showAllCaptainCommunities}
                >
                  <option value="">
                    {selectedLocation || showAllCaptainCommunities ? "Select Co-Captain 2" : "Select Location First"}
                  </option>

                  {captainMemberChoices.map(member => (
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
                  placeholder="Filter teams, leagues, divisions, captains, club pros..."
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

                <button
                  type="button"
                  onClick={expandAllGroups}
                  className="rounded-xl bg-slate-200 px-4 py-3 font-semibold text-slate-800 hover:bg-slate-300"
                >
                  Expand All
                </button>

                <button
                  type="button"
                  onClick={collapseAllGroups}
                  className="rounded-xl bg-slate-200 px-4 py-3 font-semibold text-slate-800 hover:bg-slate-300"
                >
                  Collapse All
                </button>

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

              {groupedTeams.map(group => {
                const expanded = expandedGroupKeys.includes(group.key);

                return (
                <div key={group.key} className="overflow-hidden rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.key)}
                    className="flex w-full flex-wrap items-center justify-between gap-2 bg-slate-900 px-4 py-3 text-left text-white hover:bg-slate-800"
                    aria-expanded={expanded}
                  >
                    <div className="min-w-0">
                      <div className="truncate text-xs font-semibold uppercase tracking-wide text-blue-200">
                        {group.leagueName}
                      </div>
                      <div className="truncate text-base font-bold">
                        {group.divisionName}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="rounded-lg bg-white/10 px-3 py-1 text-sm font-bold">
                        {group.teams.length} team{group.teams.length === 1 ? "" : "s"}
                      </div>
                      <div className="rounded-lg bg-white/10 px-3 py-1 text-sm font-black">
                        {expanded ? "Hide" : "Show"}
                      </div>
                    </div>
                  </button>

                  {expanded && (
                  <div className="space-y-3 bg-slate-100 p-3">
                    {group.teams.map(team => (
                      <div
                        key={team.id}
                        className={`grid grid-cols-1 gap-3 rounded-2xl border px-4 py-4 text-sm shadow-sm ring-1 transition hover:-translate-y-0.5 hover:shadow-md md:grid-cols-[minmax(170px,1.1fr)_minmax(130px,0.7fr)_minmax(190px,1fr)_minmax(220px,auto)] md:items-center ${
                          editingTeamId === team.id
                            ? "border-blue-300 bg-blue-50 ring-blue-200"
                            : "border-slate-200 bg-white ring-slate-100"
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="truncate font-bold text-slate-900">
                            {team.name}
                            {team.abbreviation ? ` (${team.abbreviation})` : ""}
                          </div>
                          <div className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[11px] font-black uppercase tracking-wide ${
                            team.is_active === false
                              ? "bg-slate-200 text-slate-700"
                              : "bg-emerald-100 text-emerald-800"
                          }`}>
                            {team.is_active === false ? "Inactive" : "Active"}
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
                          <span className="font-semibold text-slate-900">Team Leads:</span>{" "}
                          {captainSummary(team)}
                        </div>

                        <div className="grid grid-cols-2 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2 shadow-inner md:justify-end">
                          <button
                            onClick={() => openTeamSchedule(team)}
                            className="rounded-lg bg-indigo-100 px-3 py-1.5 text-xs font-semibold text-indigo-900 hover:bg-indigo-200"
                          >
                            Schedule
                          </button>

                          <button
                            onClick={() => editTeam(team)}
                            className="rounded-lg bg-blue-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-800"
                          >
                            Edit
                          </button>

                          <button
                            onClick={() => openCopyTeam(team)}
                            className="rounded-lg bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-900 hover:bg-emerald-200"
                          >
                            Copy
                          </button>

                          <button
                            onClick={() => toggleTeamActive(team)}
                            className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                              team.is_active === false
                                ? "bg-emerald-100 text-emerald-900 hover:bg-emerald-200"
                                : "bg-amber-100 text-amber-900 hover:bg-amber-200"
                            }`}
                          >
                            {team.is_active === false ? "Activate" : "Inactivate"}
                          </button>

                          <button
                            onClick={() => {
                              if (confirmUnsavedChanges()) router.push(`/teams/${team.id}`);
                            }}
                            className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
                          >
                            Roster ({team.roster_count || 0})
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
                  )}
                </div>
                );
              })}

              {filteredTeams.length === 0 && (
                <div className="text-slate-500">
                  {teams.length === 0 ? "No teams created yet." : "No teams match the current filter."}
                </div>
              )}

            </div>
          </div>

        </div>
        {scheduleTeam && (
          <TeamScheduleModal
            title="Team Schedule"
            subtitle={`${scheduleTeam.divisions?.leagues?.name || "League"} · ${scheduleTeam.divisions?.name || "Division"}`}
            teams={scheduleTeams}
            selectedTeamId={scheduleTeam.id}
            onSelectTeam={(team) =>
              setScheduleTeam({
                ...scheduleTeam,
                ...team,
              })
            }
            matches={scheduleMatches}
            byes={scheduleByes}
            ratings={scheduleRatings}
            ratingType={scheduleTeam.divisions?.rating_type || "dupr"}
            loading={scheduleLoading}
            compact
            onClose={() => {
              setScheduleTeam(null);
              setScheduleTeams([]);
              setScheduleMatches([]);
              setScheduleByes([]);
              setScheduleRatings([]);
            }}
          />
        )}
        {copyTeam && (
          <CopyTeamModal
            team={copyTeam}
            teamName={copyTeamName}
            leagues={activeLeagues}
            divisions={copyTargetDivisions}
            targetLeague={copyTargetLeague}
            targetDivision={copyTargetDivision}
            copyRoster={copyRoster}
            copying={copyingTeam}
            onTeamNameChange={setCopyTeamName}
            onLeagueChange={(leagueId) => {
              setCopyTargetLeague(leagueId);
              setCopyTargetDivision("");
            }}
            onDivisionChange={setCopyTargetDivision}
            onCopyRosterChange={setCopyRoster}
            onClose={closeCopyTeam}
            onCopy={copyTeamToDivision}
          />
        )}
      </div>
    </main>
  );
}

function CopyTeamModal({
  team,
  teamName,
  leagues,
  divisions,
  targetLeague,
  targetDivision,
  copyRoster,
  copying,
  onTeamNameChange,
  onLeagueChange,
  onDivisionChange,
  onCopyRosterChange,
  onClose,
  onCopy,
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-950 px-5 py-4 text-white md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-xs font-black uppercase tracking-wide text-emerald-200">
              Copy Team
            </div>
            <h2 className="mt-1 text-2xl font-black">{team.name}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={copying}
            className="rounded-xl bg-white/10 px-4 py-2 text-sm font-bold text-white hover:bg-white/20 disabled:opacity-50"
          >
            Close
          </button>
        </div>

        <div className="space-y-4 p-5">
          <Field
            label="New Team Name"
            hint="Use a new-season name or keep the current team name."
          >
            <input
              value={teamName}
              onChange={(e) => onTeamNameChange(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3"
            />
          </Field>

          <Field
            label="Target League"
            hint="Only active-season leagues are available."
          >
            <select
              value={targetLeague}
              onChange={(e) => onLeagueChange(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3"
            >
              <option value="">Select League</option>
              {leagues.map((league) => (
                <option key={league.id} value={league.id}>
                  {league.name}
                </option>
              ))}
            </select>
          </Field>

          <Field
            label="Target Division"
            hint="The copied team will be placed in this division."
          >
            <select
              value={targetDivision}
              onChange={(e) => onDivisionChange(e.target.value)}
              disabled={!targetLeague}
              className="w-full rounded-xl border border-slate-300 px-4 py-3"
            >
              <option value="">
                {targetLeague ? "Select Division" : "Select League First"}
              </option>
              {divisions.map((division) => (
                <option key={division.id} value={division.id}>
                  {division.name}
                </option>
              ))}
            </select>
          </Field>

          <label className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={copyRoster}
              onChange={(e) => onCopyRosterChange(e.target.checked)}
              className="mt-1"
            />
            <span>
              <span className="font-semibold text-slate-900">Copy roster players</span>
              <span className="block text-xs text-slate-500">
                Captains, club pro, and team settings are copied either way. Turn this off to create the team with an empty roster.
              </span>
            </span>
          </label>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={copying}
            className="rounded-xl bg-slate-200 px-5 py-3 font-bold text-slate-900 hover:bg-slate-300 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onCopy}
            disabled={copying}
            className="rounded-xl bg-emerald-700 px-5 py-3 font-bold text-white hover:bg-emerald-800 disabled:opacity-50"
          >
            {copying ? "Copying..." : "Copy Team"}
          </button>
        </div>
      </div>
    </div>
  );
}

async function loadAllRosterRows() {
  const pageSize = 1000;
  let from = 0;
  const rows = [];

  while (true) {
    const { data, error } = await supabase
      .from("team_members")
      .select("team_id")
      .range(from, from + pageSize - 1);

    if (error) return { rows: [], error };

    rows.push(...(data || []));

    if (!data || data.length < pageSize) break;

    from += pageSize;
  }

  return { rows, error: null };
}

function copyTeamPayload(team, teamName, targetDivisionId) {
  return {
    name: teamName,
    abbreviation: team.abbreviation || null,
    division_id: targetDivisionId,
    home_location_id: team.home_location_id || null,
    captain_member_id: team.captain_member_id || null,
    co_captain_member_id: team.co_captain_member_id || null,
    co_captain_2_member_id: team.co_captain_2_member_id || null,
    club_pro_member_id: team.club_pro_member_id || null,
    notes: team.notes || null,
    is_active: true,
    updated_at: new Date().toISOString(),
  };
}

function copyRosterPayload(row, teamId) {
  const { id, team_id, created_at, updated_at, teams, members, ...copyableFields } = row;
  void id;
  void team_id;
  void created_at;
  void updated_at;
  void teams;
  void members;

  return {
    ...copyableFields,
    team_id: teamId,
    updated_at: new Date().toISOString(),
  };
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

function memberBaseName(member) {
  return (
    `${member.first_name || ""} ${member.last_name || ""}`.trim() ||
    member.full_name ||
    member.email ||
    "Unnamed Member"
  );
}

function compareScheduleTeams(a, b) {
  const aStanding = a.standing || {};
  const bStanding = b.standing || {};
  const aRank = Number(aStanding.rank || 0);
  const bRank = Number(bStanding.rank || 0);

  if (aRank && bRank && aRank !== bRank) return aRank - bRank;
  if (aRank && !bRank) return -1;
  if (!aRank && bRank) return 1;

  const pointsDifference =
    Number(bStanding.standings_points || 0) - Number(aStanding.standings_points || 0);

  if (pointsDifference !== 0) return pointsDifference;

  return String(a.name || "").localeCompare(String(b.name || ""));
}

function filterByesForPublishedSchedule(byes, matches) {
  const publishedScheduleKeys = new Set(
    matches.map((match) =>
      scheduleWeekKey(match.division_id, match.week_number, match.scheduled_date)
    )
  );

  return byes.filter((bye) =>
    publishedScheduleKeys.has(scheduleWeekKey(bye.division_id, bye.week_number, bye.bye_date))
  );
}

function scheduleWeekKey(divisionId, weekNumber, date) {
  return `${divisionId || ""}:${weekNumber || ""}:${date || ""}`;
}

