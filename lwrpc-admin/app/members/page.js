"use client";

import LoadingScreen from "../components/LoadingScreen";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppHeader from "../components/AppHeader";
import { getRequestAuthorizationHeaders, requireRole, supabase } from "../lib/auth";
import { ROLE_LEVELS } from "../lib/permissions";
import RoleCapabilityModal from "../components/RoleCapabilityModal";
import { formatPhoneNumberForStorage, formatPhoneNumberInput } from "../lib/phone";
import { isValidEmailAddress, normalizeEmailAddress } from "../lib/email";
import { NOTIFICATION_EMAIL, NOTIFICATION_TEXT, notificationPreferenceLabel } from "../lib/notificationPreferences";
import { confirmUnsavedChanges, useUnsavedChangesWarning } from "../lib/useUnsavedChangesWarning";

const PAGE_SIZE = 100;
const CLEAN_MEMBERS_BATCH_SIZE = 25;
const ROLE_CORRECTION_BATCH_SIZE = 25;
const INACTIVE_PROTECTED_ROLES = new Set(["league_manager", "club_pro", "commissioner"]);
const MEMBER_EXPORT_TYPES = [
  { value: "membership_all", label: "Membership (All)" },
  { value: "league", label: "League" },
  { value: "players", label: "Players" },
  { value: "captains", label: "Captains" },
  { value: "club_pro", label: "Club Pro" },
  { value: "league_manager", label: "League Manager" },
  { value: "commissioner", label: "Commissioner" },
];

export default function MembersPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState([]);
  const [clubLocations, setClubLocations] = useState([]);
  const [seasons, setSeasons] = useState([]);
  const [search, setSearch] = useState("");
  const [sortConfig, setSortConfig] = useState({
    key: "member",
    direction: "asc",
  });
  const [showCurrentRosterOnly, setShowCurrentRosterOnly] = useState(false);
  const [includeInactiveMembers, setIncludeInactiveMembers] = useState(false);
  const [page, setPage] = useState(1);
  const [cleaningMembers, setCleaningMembers] = useState(false);
  const [markingAllInactive, setMarkingAllInactive] = useState(false);
  const [resettingPasswordMemberId, setResettingPasswordMemberId] = useState("");
  const [showMaintenance, setShowMaintenance] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [roleHelpOpen, setRoleHelpOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportType, setExportType] = useState("membership_all");
  const [exportSeasonId, setExportSeasonId] = useState("");
  const [exportingMembers, setExportingMembers] = useState(false);
  const [correctingRoles, setCorrectingRoles] = useState(false);
  const [teamsMember, setTeamsMember] = useState(null);
  const [savingNewMember, setSavingNewMember] = useState(false);
  const [newMemberForm, setNewMemberForm] = useState(initialMemberForm());

  useUnsavedChangesWarning(
    Boolean(showAddMember && (
      newMemberForm.first_name.trim() ||
      newMemberForm.last_name.trim() ||
      newMemberForm.email.trim() ||
      newMemberForm.phone.trim() ||
      newMemberForm.club_location.trim() ||
      newMemberForm.dupr_id.trim() ||
      newMemberForm.renewal_date ||
      newMemberForm.notification_preference !== NOTIFICATION_EMAIL ||
      newMemberForm.role !== "player"
    )),
    "member"
  );

  const loadMembers = useCallback(async function loadMembers() {
    setLoading(true);

    const user = await requireRole(router, "league_manager");
    if (!user) return;

    const [
      { data, error },
      { data: seasonData, error: seasonError },
      { data: locationData, error: locationError },
    ] = await Promise.all([
      supabase
        .from("members")
        .select(`
          id,
          first_name,
          last_name,
          email,
          phone,
          club_location,
          dupr_id,
          is_active_member,
          created_at,
          user_roles (
            role
          )
        `)
        .order("last_name", { ascending: true }),
      supabase
        .from("seasons")
        .select("id, name, is_active, start_date")
        .order("start_date", { ascending: false }),
      supabase
        .from("locations")
        .select("id, name")
        .or("is_active.eq.true,is_active.is.null")
        .order("name", { ascending: true }),
    ]);

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    if (seasonError) {
      alert(seasonError.message);
      setLoading(false);
      return;
    }

    if (locationError) {
      alert(locationError.message);
      setLoading(false);
      return;
    }

    const memberRows = data || [];
    const memberIdSet = new Set(memberRows.map((member) => String(member.id)));
    let teamsByMemberId = {};
    let allTeamsByMemberId = {};

    if (memberIdSet.size > 0) {
      const { rows: teamRows, error: teamError } = await loadAllMemberTeamRows();

      if (teamError) {
        alert(teamError.message);
        setLoading(false);
        return;
      }

      teamsByMemberId = (teamRows || []).reduce((byMember, row) => {
        if (!memberIdSet.has(String(row.member_id))) return byMember;
        if (!allTeamsByMemberId[row.member_id]) allTeamsByMemberId[row.member_id] = [];
        allTeamsByMemberId[row.member_id].push({
          ...row.teams,
          roster_role: memberTeamRole(row.member_id, row.teams),
        });
        if (!byMember[row.member_id]) byMember[row.member_id] = [];
        if (row.teams?.is_active !== false) {
          byMember[row.member_id].push({
            ...row.teams,
            roster_role: memberTeamRole(row.member_id, row.teams),
          });
        }
        return byMember;
      }, {});

      teamsByMemberId = Object.fromEntries(
        Object.entries(teamsByMemberId).map(([memberId, teams]) => [
          memberId,
          sortMemberTeams(teams),
        ])
      );
      allTeamsByMemberId = Object.fromEntries(
        Object.entries(allTeamsByMemberId).map(([memberId, teams]) => [
          memberId,
          sortMemberTeams(teams),
        ])
      );
    }

    setMembers(
      memberRows.map((member) => ({
        ...member,
        teams: teamsByMemberId[member.id] || [],
        all_teams: allTeamsByMemberId[member.id] || teamsByMemberId[member.id] || [],
      }))
    );
    setSeasons(seasonData || []);
    setClubLocations(locationData || []);
    setLoading(false);
  }, [router]);

  async function cleanMembers() {
    if (cleaningMembers) return;

    const updates = members
      .map((member) => {
        const cleanedPhone = formatPhoneNumberForStorage(member.phone);
        const currentPhone = String(member.phone || "").trim();

        if (!currentPhone || cleanedPhone === currentPhone) {
          return null;
        }

        return {
          id: member.id,
          phone: cleanedPhone,
        };
      })
      .filter(Boolean);

    if (updates.length === 0) {
      alert("No member phone numbers need cleanup.");
      return;
    }

    const ok = confirm(
      [
        "Clean Members will standardize member phone numbers only.",
        "",
        "It will:",
        `- Update ${updates.length} phone number${updates.length === 1 ? "" : "s"} that can be safely cleaned.`,
        "- Format 10-digit US numbers as (###) ###-####.",
        "- Remove a leading 1 from 11-digit US numbers.",
        "- Preserve extensions like x123.",
        "",
        "It will not change names, emails, DUPR IDs, roles, locations, or phone numbers it cannot safely interpret.",
        "",
        "Continue?",
      ].join("\n")
    );

    if (!ok) return;

    setCleaningMembers(true);

    const updatedAt = new Date().toISOString();

    for (let i = 0; i < updates.length; i += CLEAN_MEMBERS_BATCH_SIZE) {
      const batch = updates.slice(i, i + CLEAN_MEMBERS_BATCH_SIZE);
      const results = await Promise.all(
        batch.map((update) =>
          supabase
            .from("members")
            .update({
              phone: update.phone,
              updated_at: updatedAt,
            })
            .eq("id", update.id)
        )
      );

      const failedResult = results.find((result) => result.error);

      if (failedResult?.error) {
        alert(failedResult.error.message);
        setCleaningMembers(false);
        return;
      }
    }

    await loadMembers();
    setCleaningMembers(false);
    alert(`Cleaned ${updates.length} member phone number${updates.length === 1 ? "" : "s"}.`);
  }

  async function markAllMembersInactive() {
    if (markingAllInactive) return;

    const activeMembers = members.filter((member) => member.is_active_member !== false);
    const eligibleMembers = activeMembers.filter(
      (member) => member.is_active_member !== false && !memberHasInactiveProtectedRole(member)
    );
    const activeCount = eligibleMembers.length;

    if (activeCount === 0) {
      alert(
        activeMembers.length === 0
          ? "All members are already inactive."
          : "No eligible active members. League Managers, Club Pros, and Commissioners are protected."
      );
      return;
    }

    const ok = confirm(
      [
        `Mark ${activeCount} active member${activeCount === 1 ? "" : "s"} inactive?`,
        "",
        "Use this before a fresh MembershipWorks import when you want the import file to reactivate current members.",
        "League Managers, Club Pros, and Commissioners will be left active.",
        "",
        "Continue?",
      ].join("\n")
    );

    if (!ok) return;

    setMarkingAllInactive(true);

    const { error } = await supabase
      .from("members")
      .update({
        is_active_member: false,
        updated_at: new Date().toISOString(),
      })
      .in("id", eligibleMembers.map((member) => member.id));

    setMarkingAllInactive(false);

    if (error) {
      alert(error.message);
      return;
    }

    await loadMembers();
    setIncludeInactiveMembers(true);
    alert(`${activeCount} member${activeCount === 1 ? "" : "s"} marked inactive.`);
  }

  async function correctRoles() {
    if (correctingRoles) return;

    setCorrectingRoles(true);

    const [
      { data: captainRoleRows, error: roleError },
      { rows: teamMemberRows, error: teamMemberError },
    ] = await Promise.all([
      supabase
        .from("user_roles")
        .select("id, member_id, role")
        .eq("role", "captain"),
      loadAllMemberTeamRows(),
    ]);

    if (roleError || teamMemberError) {
      alert(roleError?.message || teamMemberError?.message);
      setCorrectingRoles(false);
      return;
    }

    const activeCaptainMemberIds = new Set();

    (teamMemberRows || [])
      .filter((row) => row.teams?.is_active !== false)
      .forEach((row) => {
        const teamRole = memberTeamRole(row.member_id, row.teams);

        if (teamRole === "Captain" || teamRole === "Co-Captain") {
          activeCaptainMemberIds.add(String(row.member_id));
        }
      });

    const staleCaptainRoles = (captainRoleRows || []).filter(
      (roleRow) => roleRow.member_id && !activeCaptainMemberIds.has(String(roleRow.member_id))
    );

    if (staleCaptainRoles.length === 0) {
      alert("No stale Captain roles found. Every Captain role is tied to an active team captain or co-captain assignment.");
      setCorrectingRoles(false);
      return;
    }

    const ok = confirm(
      [
        `Change ${staleCaptainRoles.length} stale Captain role${staleCaptainRoles.length === 1 ? "" : "s"} back to Player?`,
        "",
        "This checks active team captain and co-captain assignments, including captain-only assignments outside the roster.",
        "Members who are no longer assigned as a captain or co-captain on an active team will be changed to Player.",
        "",
        "Continue?",
      ].join("\n")
    );

    if (!ok) {
      setCorrectingRoles(false);
      return;
    }

    const updatedAt = new Date().toISOString();
    const staleRoleIds = staleCaptainRoles.map((roleRow) => roleRow.id).filter(Boolean);

    for (let i = 0; i < staleRoleIds.length; i += ROLE_CORRECTION_BATCH_SIZE) {
      const batchIds = staleRoleIds.slice(i, i + ROLE_CORRECTION_BATCH_SIZE);
      const { error } = await supabase
        .from("user_roles")
        .update({
          role: "player",
          updated_at: updatedAt,
        })
        .in("id", batchIds);

      if (error) {
        alert(error.message);
        setCorrectingRoles(false);
        return;
      }
    }

    await loadMembers();
    setCorrectingRoles(false);
    alert(`${staleRoleIds.length} Captain role${staleRoleIds.length === 1 ? "" : "s"} changed back to Player.`);
  }

  function updateNewMember(field, value) {
    setNewMemberForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function closeAddMember() {
    if (savingNewMember) return;
    if (!confirmUnsavedChanges()) return;

    setShowAddMember(false);
    setNewMemberForm(initialMemberForm());
  }

  async function addMember() {
    const normalizedEmail = normalizeEmailAddress(newMemberForm.email);
    const firstName = newMemberForm.first_name.trim();
    const lastName = newMemberForm.last_name.trim();

    if (!firstName && !lastName) {
      alert("Please enter at least a first or last name.");
      return;
    }

    if (normalizedEmail && !isValidEmailAddress(normalizedEmail)) {
      alert("Please enter a valid email address, such as name@example.com.");
      return;
    }

    setSavingNewMember(true);

    const { data, error } = await supabase
      .from("members")
      .insert({
        first_name: firstName || null,
        last_name: lastName || null,
        email: normalizedEmail || null,
        phone: formatPhoneNumberForStorage(newMemberForm.phone) || null,
        membershipworks_account_id: manualMembershipWorksAccountId(),
        notification_preference: newMemberForm.notification_preference || NOTIFICATION_EMAIL,
        club_location: newMemberForm.club_location.trim() || null,
        location_id: locationIdForName(clubLocations, newMemberForm.club_location),
        dupr_id: newMemberForm.dupr_id.trim() || null,
        renewal_date: newMemberForm.renewal_date || null,
      })
      .select("*")
      .single();

    if (error) {
      alert(error.message);
      setSavingNewMember(false);
      return;
    }

    if (newMemberForm.role && newMemberForm.role !== "player") {
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({
          user_id: null,
          member_id: data.id,
          role: newMemberForm.role,
        });

      if (roleError) {
        alert(`Member was created, but the role could not be saved: ${roleError.message}`);
      }
    }

    setSavingNewMember(false);
    setShowAddMember(false);
    setNewMemberForm(initialMemberForm());
    await loadMembers();
  }

  function openMember(memberId) {
    if (confirmUnsavedChanges()) router.push(`/members/${memberId}`);
  }

  function openMemberTeams(member) {
    setTeamsMember(member);
  }

  async function exportMembers() {
    if (exportingMembers) return;

    setExportingMembers(true);

    const [
      { rows: memberRows, error: memberError },
      { rows: teamRows, error: teamError },
      { rows: ratingRows, error: ratingError },
    ] = await Promise.all([
      loadAllExportMemberRows(),
      loadAllMemberTeamRows(),
      loadAllRatingRows(exportSeasonId),
    ]);

    if (memberError || teamError || ratingError) {
      alert(memberError?.message || teamError?.message || ratingError?.message);
      setExportingMembers(false);
      return;
    }

    const selectedSeason = seasons.find((season) => String(season.id) === String(exportSeasonId));
    const ratingsByMemberSeason = (ratingRows || []).reduce((byKey, rating) => {
      byKey[`${rating.member_id}:${rating.season_id}`] = rating;
      return byKey;
    }, {});
    const teamRowsByMemberId = (teamRows || []).reduce((byMember, row) => {
      if (!row.member_id) return byMember;
      if (!byMember[row.member_id]) byMember[row.member_id] = [];
      byMember[row.member_id].push(row);
      return byMember;
    }, {});

    const filteredMembers = (memberRows || []).filter((member) =>
      memberMatchesExportType(member, teamRowsByMemberId[member.id] || [], exportType, exportSeasonId)
    );

    const header = [
      "Last",
      "First",
      "Full Name",
      "Email",
      "Phone",
      "Notification Option",
      "Club",
      "DUPR ID",
      "User Role",
      "Status",
      "Season",
      "DUPR Doubles Rating",
      "Season Rating",
      "PrimeTime Rating",
      "Team Name",
      "League",
      "Division",
      "Team Role",
    ];

    const rows = [header];

    filteredMembers.forEach((member) => {
      const memberTeams = (teamRowsByMemberId[member.id] || []).filter((row) =>
        teamRowMatchesSeason(row, exportSeasonId)
      );
      const exportTeamRows = memberTeams.length > 0 ? memberTeams : [null];

      exportTeamRows.forEach((teamRow) => {
        const team = teamRow?.teams || null;
        const seasonId = exportSeasonId || team?.divisions?.leagues?.season_id || "";
        const rating = ratingsByMemberSeason[`${member.id}:${seasonId}`] || {};

        rows.push([
          member.last_name || "",
          member.first_name || "",
          memberFullName(member),
          member.email || "",
          member.phone || "",
          notificationPreferenceLabel(member.notification_preference),
          member.club_location || "",
          member.dupr_id || "",
          memberRole(member),
          member.is_active_member === false ? "Inactive" : "Active",
          selectedSeason?.name || team?.divisions?.leagues?.seasons?.name || "",
          rating.dupr_doubles_rating ?? "",
          rating.season_dupr_rating ?? "",
          rating.season_primetime_rating ?? "",
          team?.name || "",
          team?.divisions?.leagues?.name || "",
          team?.divisions?.name || "",
          team ? memberTeamRole(member.id, team) : "",
        ]);
      });
    });

    const csv = toCsv(rows);
    const exportLabel = MEMBER_EXPORT_TYPES.find((item) => item.value === exportType)?.label || "members";
    downloadCsv(
      csv,
      `lwrpc-member-export-${slugify(exportLabel)}-${selectedSeason ? slugify(selectedSeason.name) : "all-seasons"}-${localDateString()}.csv`
    );

    setExportingMembers(false);
    setExportModalOpen(false);
  }

  async function resetMemberPassword(member) {
    const normalizedEmail = normalizeEmailAddress(member.email);

    if (!normalizedEmail) {
      alert("This member does not have an email address on file.");
      return;
    }

    if (!isValidEmailAddress(normalizedEmail)) {
      alert("This member does not have a valid email address on file.");
      return;
    }

    setResettingPasswordMemberId(member.id);

    const response = await fetch("/api/member-password-reset-check", {
      method: "POST",
      headers: await getRequestAuthorizationHeaders({
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({
        email: normalizedEmail,
      }),
    });
    const result = await response.json();

    setResettingPasswordMemberId("");

    if (!response.ok || !result.success) {
      alert(result.error || "Unable to send the login email.");
      return;
    }

    if (!result.memberExists) {
      alert("That email address is not linked to a league member record.");
      return;
    }

    if (!result.isActiveMember) {
      alert("That member record is currently inactive. Reactivate the member before sending a login email.");
      return;
    }

    alert(
      result.emailType === "invite"
        ? `Account setup email sent to ${normalizedEmail}.`
        : `Password reset email sent to ${normalizedEmail}.`
    );
  }

  function formatRole(role) {
    if (role === "club_pro") return "Club Pro";
    if (role === "league_manager") return "League Manager";
    if (role === "commissioner") return "Commissioner";
    if (role === "captain") return "Captain";
    return "Player";
  }

  const getMemberRole = useCallback(function getMemberRole(member) {
    return formatRole(member.user_roles?.[0]?.role || "player");
  }, []);

  function changeSort(key) {
    setSortConfig((current) => ({
      key,
      direction:
        current.key === key && current.direction === "asc" ? "desc" : "asc",
    }));
    setPage(1);
  }

  function goToPage(value) {
    const requestedPage = Number(value);

    if (!requestedPage || requestedPage < 1) {
      setPage(1);
      return;
    }

    if (requestedPage > totalPages) {
      setPage(totalPages);
      return;
    }

    setPage(requestedPage);
  }

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  useEffect(() => {
    setPage(1);
  }, [includeInactiveMembers, search, showCurrentRosterOnly]);

  const filteredMembers = useMemo(() => {
    const q = search.trim().toLowerCase();
    const activeFilteredMembers = includeInactiveMembers
      ? members
      : members.filter((member) => member.is_active_member !== false);
    const rosterFilteredMembers = showCurrentRosterOnly
      ? activeFilteredMembers.filter((member) => (member.teams?.length || 0) > 0)
      : activeFilteredMembers;

    if (!q) return rosterFilteredMembers;

    return rosterFilteredMembers.filter((member) => {
      const fullName = `${member.first_name || ""} ${member.last_name || ""}`;
      const reverseName = `${member.last_name || ""} ${member.first_name || ""}`;
      const role = getMemberRole(member);

      return (
        fullName.toLowerCase().includes(q) ||
        reverseName.toLowerCase().includes(q) ||
        (member.email || "").toLowerCase().includes(q) ||
        (member.phone || "").toLowerCase().includes(q) ||
        (member.club_location || "").toLowerCase().includes(q) ||
        (member.dupr_id || "").toLowerCase().includes(q) ||
        role.toLowerCase().includes(q)
      );
    });
  }, [getMemberRole, includeInactiveMembers, members, search, showCurrentRosterOnly]);

  const sortedMembers = useMemo(() => {
    const direction = sortConfig.direction === "desc" ? -1 : 1;

    return [...filteredMembers].sort((a, b) => {
      const result = compareSortValues(
        memberSortValue(a, sortConfig.key),
        memberSortValue(b, sortConfig.key)
      );

      if (result !== 0) return result * direction;

      return compareSortValues(memberSortValue(a, "member"), memberSortValue(b, "member"));
    });
  }, [filteredMembers, sortConfig]);

  const totalPages = Math.max(1, Math.ceil(sortedMembers.length / PAGE_SIZE));

  const pagedMembers = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return sortedMembers.slice(start, start + PAGE_SIZE);
  }, [page, sortedMembers]);

  if (loading) {
    return <LoadingScreen subtitle="Loading Members..." />;
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-6">
      <div className="mx-auto max-w-7xl">
        <AppHeader
          title="Member Administration"
          subtitle="Search, review, edit, and manage club members."
        />

        <div className="rounded-2xl bg-white p-4 shadow md:p-6">
          <div className="mb-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">Member Directory</div>
                <h2 className="mt-1 text-xl font-black text-slate-950">Member Search</h2>
              </div>

              <div className="min-w-[5.5rem] rounded-xl bg-slate-900 px-4 py-2 text-right text-white">
                <div className="text-[10px] font-bold uppercase tracking-wide text-slate-300">Members</div>
                <div className="text-2xl font-black leading-none">{filteredMembers.length}</div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 md:flex md:flex-wrap md:items-center md:justify-end">
              <button
                type="button"
                onClick={() => setShowAddMember(true)}
                className="min-h-12 w-full rounded-xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-800 md:w-auto"
              >
                Add Member
              </button>

              <button
                type="button"
                onClick={() => setShowCurrentRosterOnly((value) => !value)}
                className={`min-h-12 w-full rounded-xl px-3 py-3 text-sm font-bold leading-tight md:w-auto md:px-4 ${
                  showCurrentRosterOnly
                    ? "bg-emerald-700 text-white hover:bg-emerald-800"
                    : "bg-emerald-100 text-emerald-900 hover:bg-emerald-200"
                }`}
              >
                {showCurrentRosterOnly ? "Show All Members" : "Current Rosters Only"}
              </button>

              <button
                type="button"
                onClick={() => setIncludeInactiveMembers((value) => !value)}
                className={`min-h-12 w-full rounded-xl px-3 py-3 text-sm font-bold leading-tight md:w-auto md:px-4 ${
                  includeInactiveMembers
                    ? "bg-red-700 text-white hover:bg-red-800"
                    : "bg-red-100 text-red-900 hover:bg-red-200"
                }`}
              >
                {includeInactiveMembers ? "Hide Inactive" : "Include Inactive"}
              </button>

              <button
                type="button"
                onClick={() => setShowMaintenance((value) => !value)}
                className="min-h-12 w-full rounded-xl bg-blue-100 px-4 py-3 text-sm font-bold text-blue-800 hover:bg-blue-200 md:w-auto"
              >
                {showMaintenance ? "Hide Tools" : "Data Tools"}
              </button>

            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 border-t border-slate-200 pt-5 md:grid-cols-[1fr_auto] md:gap-4">
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">
                Search Members
              </label>

              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, email, phone, location, DUPR ID, or role"
                className="w-full rounded-xl border border-slate-300 px-4 py-3"
              />
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setPage(1);
                }}
                className="min-h-12 w-full rounded-xl bg-slate-200 px-5 py-3 font-bold text-slate-900 hover:bg-slate-300"
              >
                Clear Search
              </button>
            </div>

          </div>
        </div>

        {showMaintenance && (
          <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-5 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Data Tools
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Import MembershipWorks files and run controlled cleanup tools for member records.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => router.push("/member-import")}
                  className="rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white hover:bg-slate-800"
                >
                  Import MembershipWorks
                </button>

                <button
                  type="button"
                  onClick={() => setExportModalOpen(true)}
                  className="rounded-xl bg-emerald-700 px-5 py-3 font-semibold text-white hover:bg-emerald-800"
                >
                  Member Export
                </button>

                <button
                  type="button"
                  onClick={cleanMembers}
                  disabled={cleaningMembers}
                  className="rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {cleaningMembers ? "Cleaning..." : "Clean Members"}
                </button>

                <button
                  type="button"
                  onClick={correctRoles}
                  disabled={correctingRoles}
                  className="rounded-xl bg-indigo-700 px-5 py-3 font-semibold text-white hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {correctingRoles ? "Correcting..." : "Correct Roles"}
                </button>

                <button
                  type="button"
                  onClick={markAllMembersInactive}
                  disabled={markingAllInactive}
                  className="rounded-xl bg-red-700 px-5 py-3 font-semibold text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {markingAllInactive ? "Updating..." : "Mark All Inactive"}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 rounded-2xl bg-white shadow">
          <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-4 md:flex-row md:items-center md:justify-between">
            <div className="text-sm text-slate-600">
              Showing{" "}
              <span className="font-semibold text-slate-900">
                {filteredMembers.length === 0
                  ? 0
                  : (page - 1) * PAGE_SIZE + 1}
              </span>{" "}
              to{" "}
              <span className="font-semibold text-slate-900">
                {Math.min(page * PAGE_SIZE, filteredMembers.length)}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-slate-900">
                {filteredMembers.length}
              </span>{" "}
              members
            </div>

            <Pagination
              page={page}
              totalPages={totalPages}
              setPage={setPage}
              goToPage={goToPage}
            />
          </div>

          <div className="hidden overflow-visible md:block">
          <table className="min-w-[1265px] table-fixed">
            <colgroup>
              <col className="w-[250px]" />
              <col className="w-[160px]" />
              <col className="w-[190px]" />
              <col className="w-[145px]" />
              <col className="w-[115px]" />
              <col className="w-[155px]" />
              <col className="w-[250px]" />
            </colgroup>
            <thead className="bg-slate-900 text-sm uppercase tracking-wide text-white">
              <tr>
                <th className="sticky top-0 z-20 bg-slate-900 px-4 py-4 text-left" aria-sort={sortAria("member", sortConfig)}>
                  <SortHeader
                    active={sortConfig.key === "member"}
                    direction={sortConfig.direction}
                    label="Member"
                    onClick={() => changeSort("member")}
                  />
                </th>
                <th className="sticky top-0 z-20 bg-slate-900 px-4 py-4 text-left" aria-sort={sortAria("location", sortConfig)}>
                  <SortHeader
                    active={sortConfig.key === "location"}
                    direction={sortConfig.direction}
                    label="Location"
                    onClick={() => changeSort("location")}
                  />
                </th>
                <th className="sticky top-0 z-20 bg-slate-900 px-4 py-4 text-left" aria-sort={sortAria("phone", sortConfig)}>
                  <SortHeader
                    active={sortConfig.key === "phone"}
                    direction={sortConfig.direction}
                    label="Phone"
                    onClick={() => changeSort("phone")}
                  />
                </th>
                <th className="sticky top-0 z-20 bg-slate-900 px-4 py-4 text-left" aria-sort={sortAria("dupr_id", sortConfig)}>
                  <SortHeader
                    active={sortConfig.key === "dupr_id"}
                    direction={sortConfig.direction}
                    label="DUPR ID"
                    onClick={() => changeSort("dupr_id")}
                  />
                </th>
                <th className="sticky top-0 z-20 bg-slate-900 px-4 py-4 text-left" aria-sort={sortAria("status", sortConfig)}>
                  <SortHeader
                    active={sortConfig.key === "status"}
                    direction={sortConfig.direction}
                    label="Status"
                    onClick={() => changeSort("status")}
                  />
                </th>
                <th className="sticky top-0 z-20 bg-slate-900 px-4 py-4 text-left" aria-sort={sortAria("role", sortConfig)}>
                  <div className="flex items-center gap-2">
                    <SortHeader
                      active={sortConfig.key === "role"}
                      direction={sortConfig.direction}
                      label="Role"
                      onClick={() => changeSort("role")}
                    />
                    <button
                      type="button"
                      onClick={() => setRoleHelpOpen(true)}
                      aria-label="Show role capability matrix"
                      title="Show role capability matrix"
                      className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-sm font-black text-slate-900 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-300"
                    >
                      ?
                    </button>
                  </div>
                </th>
                <th className="sticky right-0 top-0 z-40 bg-slate-900 px-4 py-4 text-right">
                  <div className="font-black text-white">
                    Actions
                  </div>
                </th>
              </tr>
            </thead>

            <tbody>
              {pagedMembers.map((member) => (
                <tr
                  key={member.id}
                  onClick={() => openMember(member.id)}
                  className="group cursor-pointer border-b border-slate-100 hover:bg-slate-50"
                >
                  <td className="px-4 py-4 align-middle">
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-semibold text-slate-900">
                          {member.last_name}, {member.first_name}
                        </div>

                        <div className="mt-1 truncate text-sm text-slate-500">
                          {member.email || "No Email"}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/members/${member.id}?edit=1`);
                        }}
                        aria-label={`Edit member ${member.first_name} ${member.last_name}`}
                        title="Edit member"
                        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-800 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-300"
                      >
                        <EditIcon />
                      </button>
                    </div>
                  </td>

                  <td className="whitespace-nowrap px-4 py-4 align-middle text-sm text-slate-700">
                    {member.club_location || "—"}
                  </td>

                  <td className="whitespace-nowrap px-4 py-4 align-middle text-sm tabular-nums text-slate-700">
                    {formatPhoneNumberForStorage(member.phone) || "—"}
                  </td>

                  <td className="whitespace-nowrap px-4 py-4 align-middle text-sm text-slate-700">
                    {member.dupr_id || "—"}
                  </td>

                  <td className="bg-white px-4 py-4 align-middle group-hover:bg-slate-50">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${
                        member.is_active_member === false
                          ? "bg-red-100 text-red-800"
                          : "bg-green-100 text-green-800"
                      }`}
                    >
                      {member.is_active_member === false ? "Inactive" : "Active"}
                    </span>
                  </td>

                  <td className="whitespace-nowrap bg-white px-4 py-4 align-middle text-sm font-semibold text-slate-700 group-hover:bg-slate-50">
                    {getMemberRole(member)}
                  </td>

                  <td className="sticky right-0 z-20 bg-white px-4 py-4 text-right align-middle group-hover:bg-slate-50">
                    <div className="flex flex-nowrap justify-end gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openMemberTeams(member);
                        }}
                        className="h-9 whitespace-nowrap rounded-lg bg-emerald-700 px-3 text-sm font-semibold text-white hover:bg-emerald-800"
                      >
                        Teams ({activeTeamCount(member)})
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          resetMemberPassword(member);
                        }}
                        disabled={resettingPasswordMemberId === member.id}
                        className="h-9 whitespace-nowrap rounded-lg bg-blue-700 px-3 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {resettingPasswordMemberId === member.id ? "Sending..." : "Reset Password"}
                      </button>

                    </div>
                  </td>
                </tr>
              ))}

              {pagedMembers.length === 0 && (
                <tr>
                  <td
                    colSpan="7"
                    className="px-4 py-10 text-center text-slate-500"
                  >
                    No members found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>

          <div className="divide-y divide-slate-100 md:hidden">
            {pagedMembers.map((member) => (
              <div key={member.id} className="px-4 py-4">
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1 font-semibold text-slate-900">
                    {member.last_name}, {member.first_name}
                  </div>

                  <button
                    type="button"
                    onClick={() => router.push(`/members/${member.id}?edit=1`)}
                    aria-label={`Edit member ${member.first_name} ${member.last_name}`}
                    title="Edit member"
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-800 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-300"
                  >
                    <EditIcon />
                  </button>
                </div>

                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => openMemberTeams(member)}
                    className="h-10 whitespace-nowrap rounded-lg bg-emerald-700 px-3 text-sm font-semibold text-white hover:bg-emerald-800"
                  >
                    Teams ({activeTeamCount(member)})
                  </button>

                  <button
                    type="button"
                    onClick={() => resetMemberPassword(member)}
                    disabled={resettingPasswordMemberId === member.id}
                    className="h-10 whitespace-nowrap rounded-lg bg-blue-700 px-3 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {resettingPasswordMemberId === member.id ? "Sending..." : "Reset Password"}
                  </button>
                </div>
              </div>
            ))}

            {pagedMembers.length === 0 && (
              <div className="px-4 py-10 text-center text-slate-500">
                No members found.
              </div>
            )}
          </div>

          <div className="flex justify-end border-t border-slate-200 px-4 py-4">
            <Pagination
              page={page}
              totalPages={totalPages}
              setPage={setPage}
              goToPage={goToPage}
            />
          </div>
        </div>

        {showAddMember && (
          <AddMemberModal
            form={newMemberForm}
            locations={clubLocations}
            saving={savingNewMember}
            onChange={updateNewMember}
            onClose={closeAddMember}
            onSave={addMember}
          />
        )}

        {teamsMember && (
          <MemberTeamsModal
            member={teamsMember}
            onClose={() => setTeamsMember(null)}
          />
        )}

        {roleHelpOpen && (
          <RoleCapabilityModal onClose={() => setRoleHelpOpen(false)} />
        )}

        {exportModalOpen && (
          <MemberExportModal
            exportType={exportType}
            exportSeasonId={exportSeasonId}
            exporting={exportingMembers}
            seasons={seasons}
            onExportTypeChange={setExportType}
            onExportSeasonChange={setExportSeasonId}
            onClose={() => {
              if (!exportingMembers) setExportModalOpen(false);
            }}
            onExport={exportMembers}
          />
        )}
      </div>
    </main>
  );
}

async function loadAllMemberTeamRows() {
  const pageSize = 1000;
  let from = 0;
  const rows = [];

  while (true) {
    const { data, error } = await supabase
      .from("team_members")
      .select(`
        member_id,
        teams (
          id,
          name,
          is_active,
          captain_member_id,
          co_captain_member_id,
          co_captain_2_member_id,
          club_pro_member_id,
          divisions (
            id,
            name,
            leagues (
              id,
              name,
              season_id,
              seasons (
                id,
                name
              )
            )
          )
        )
      `)
      .range(from, from + pageSize - 1);

    if (error) return { rows: [], error };

    rows.push(...(data || []));

    if (!data || data.length < pageSize) break;

    from += pageSize;
  }

  const { rows: assignmentTeams, error: assignmentError } = await loadAllTeamAssignmentRows();
  if (assignmentError) return { rows: [], error: assignmentError };

  return {
    rows: mergeMemberTeamRows(rows, assignmentTeams),
    error: null,
  };
}

async function loadAllTeamAssignmentRows() {
  const pageSize = 1000;
  let from = 0;
  const rows = [];

  while (true) {
    const { data, error } = await supabase
      .from("teams")
      .select(`
        id,
        name,
        is_active,
        captain_member_id,
        co_captain_member_id,
        co_captain_2_member_id,
        club_pro_member_id,
        divisions (
          id,
          name,
          leagues (
            id,
            name,
            season_id,
            seasons (
              id,
              name
            )
          )
        )
      `)
      .range(from, from + pageSize - 1);

    if (error) return { rows: [], error };

    rows.push(...(data || []));

    if (!data || data.length < pageSize) break;

    from += pageSize;
  }

  return { rows, error: null };
}

function mergeMemberTeamRows(rosterRows, assignmentTeams) {
  const mergedRows = [];
  const seen = new Set();

  function addRow(memberId, team) {
    if (!memberId || !team?.id) return;

    const key = `${memberId}:${team.id}`;
    if (seen.has(key)) return;

    seen.add(key);
    mergedRows.push({
      member_id: memberId,
      teams: team,
    });
  }

  (rosterRows || []).forEach((row) => addRow(row.member_id, row.teams));

  (assignmentTeams || []).forEach((team) => {
    [
      team.captain_member_id,
      team.co_captain_member_id,
      team.co_captain_2_member_id,
      team.club_pro_member_id,
    ].forEach((memberId) => addRow(memberId, team));
  });

  return mergedRows;
}

async function loadAllExportMemberRows() {
  const pageSize = 1000;
  let from = 0;
  const rows = [];

  while (true) {
    const { data, error } = await supabase
      .from("members")
      .select(`
        id,
        first_name,
        last_name,
        full_name,
        email,
        phone,
        notification_preference,
        club_location,
        dupr_id,
        is_active_member,
        user_roles (
          role
        )
      `)
      .order("last_name", { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) return { rows: [], error };

    rows.push(...(data || []));

    if (!data || data.length < pageSize) break;

    from += pageSize;
  }

  return { rows, error: null };
}

async function loadAllRatingRows(seasonId) {
  const pageSize = 1000;
  let from = 0;
  const rows = [];

  while (true) {
    let query = supabase
      .from("member_season_ratings")
      .select("member_id, season_id, dupr_doubles_rating, season_dupr_rating, season_primetime_rating")
      .range(from, from + pageSize - 1);

    if (seasonId) query = query.eq("season_id", seasonId);

    const { data, error } = await query;

    if (error) return { rows: [], error };

    rows.push(...(data || []));

    if (!data || data.length < pageSize) break;

    from += pageSize;
  }

  return { rows, error: null };
}

function memberTeamRole(memberId, team) {
  if (String(team?.captain_member_id || "") === String(memberId || "")) {
    return "Captain";
  }

  if (
    String(team?.co_captain_member_id || "") === String(memberId || "") ||
    String(team?.co_captain_2_member_id || "") === String(memberId || "")
  ) {
    return "Co-Captain";
  }

  if (String(team?.club_pro_member_id || "") === String(memberId || "")) {
    return "Club Pro";
  }

  return "Player";
}

function memberTeamRoleCode(memberId, team) {
  const role = memberTeamRole(memberId, team);
  if (role === "Captain") return "C";
  if (role === "Co-Captain") return "CC";
  return "";
}

function activeTeamCount(member) {
  return (member.teams || []).filter((team) => team?.is_active !== false).length;
}

function sortMemberTeams(teams) {
  return [...(teams || [])].sort((a, b) => {
    const seasonCompare = String(teamSeasonName(b) || "").localeCompare(
      String(teamSeasonName(a) || ""),
      undefined,
      { numeric: true, sensitivity: "base" }
    );
    if (seasonCompare !== 0) return seasonCompare;

    const divisionCompare = String(a?.divisions?.name || "").localeCompare(
      String(b?.divisions?.name || ""),
      undefined,
      { numeric: true, sensitivity: "base" }
    );
    if (divisionCompare !== 0) return divisionCompare;

    return String(a?.name || "").localeCompare(String(b?.name || ""), undefined, {
      numeric: true,
      sensitivity: "base",
    });
  });
}

function teamSeasonName(team) {
  return team?.divisions?.leagues?.seasons?.name || "Season TBD";
}

function memberRole(member) {
  return member.user_roles?.[0]?.role || "player";
}

function memberFullName(member) {
  return (
    `${member.first_name || ""} ${member.last_name || ""}`.trim() ||
    member.full_name ||
    member.email ||
    ""
  );
}

function teamRowMatchesSeason(row, seasonId) {
  if (!seasonId) return true;
  return String(row.teams?.divisions?.leagues?.season_id || "") === String(seasonId);
}

function memberMatchesExportType(member, teamRows, exportType, seasonId) {
  if (exportType === "membership_all") return true;

  const role = memberRole(member);
  const matchingTeamRows = teamRows.filter((row) => teamRowMatchesSeason(row, seasonId));

  if (exportType === "league") return matchingTeamRows.length > 0;
  if (exportType === "players") return role === "player";
  if (exportType === "captains") {
    return (
      role === "captain" ||
      matchingTeamRows.some((row) => {
        const teamRole = memberTeamRole(member.id, row.teams);
        return teamRole === "Captain" || teamRole === "Co-Captain";
      })
    );
  }

  return role === exportType;
}

function toCsv(rows) {
  return rows
    .map((row) =>
      row
        .map((value) => {
          const text = String(value ?? "");
          return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
        })
        .join(",")
    )
    .join("\r\n");
}

function downloadCsv(csv, filename) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function localDateString() {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function slugify(value) {
  return String(value || "export")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function initialMemberForm() {
  return {
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    notification_preference: NOTIFICATION_EMAIL,
    club_location: "",
    dupr_id: "",
    renewal_date: "",
    role: "player",
  };
}

function manualMembershipWorksAccountId() {
  return `manual:${crypto.randomUUID()}`;
}

function locationIdForName(locations, name) {
  const normalizedName = normalizeLocationName(name);
  const location = (locations || []).find(
    (item) => normalizeLocationName(item.name || item) === normalizedName
  );

  return location?.id || null;
}

function normalizeLocationName(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function SortHeader({ active, direction, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex flex-col items-start gap-1 rounded-lg px-2 py-1 text-left font-black text-white transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-blue-300"
    >
      <span className={`rounded-full px-2 py-0.5 text-[10px] ${active ? "bg-blue-300 text-slate-950" : "bg-white/10 text-slate-300"}`}>
        {active ? (direction === "asc" ? "ASC" : "DESC") : "SORT"}
      </span>
      <span>{label}</span>
    </button>
  );
}

function sortAria(key, sortConfig) {
  if (sortConfig.key !== key) return "none";
  return sortConfig.direction === "asc" ? "ascending" : "descending";
}

function memberSortValue(member, key) {
  if (key === "location") {
    return member.club_location || "";
  }

  if (key === "phone") {
    return formatPhoneNumberForStorage(member.phone) || "";
  }

  if (key === "dupr_id") {
    return member.dupr_id || "";
  }

  if (key === "status") {
    return member.is_active_member === false ? "Inactive" : "Active";
  }

  if (key === "role") {
    return ROLE_LEVELS[memberRole(member)] || 0;
  }

  if (key === "actions") {
    return member.teams?.length || 0;
  }

  return `${member.last_name || ""} ${member.first_name || ""} ${member.email || ""}`;
}

function compareSortValues(aValue, bValue) {
  if (typeof aValue === "number" && typeof bValue === "number") {
    return aValue - bValue;
  }

  return String(aValue || "").localeCompare(String(bValue || ""), undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

function memberHasInactiveProtectedRole(member) {
  return (member.user_roles || []).some((roleRow) =>
    INACTIVE_PROTECTED_ROLES.has(roleRow.role)
  );
}

function MemberExportModal({
  exportType,
  exportSeasonId,
  exporting,
  seasons,
  onExportTypeChange,
  onExportSeasonChange,
  onClose,
  onExport,
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
      <div className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-950 px-5 py-4 text-white md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-xs font-black uppercase tracking-wide text-emerald-200">
              Data Tools
            </div>
            <h2 className="mt-1 text-2xl font-black">Member Export</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={exporting}
            className="rounded-xl bg-white/10 px-4 py-2 text-sm font-bold text-white hover:bg-white/20 disabled:opacity-50"
          >
            Close
          </button>
        </div>

        <div className="space-y-4 p-5">
          <FormField label="Export Group">
            <select
              value={exportType}
              onChange={(event) => onExportTypeChange(event.target.value)}
              disabled={exporting}
              className="w-full rounded-xl border border-slate-300 px-4 py-3"
            >
              {MEMBER_EXPORT_TYPES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Season">
            <select
              value={exportSeasonId}
              onChange={(event) => onExportSeasonChange(event.target.value)}
              disabled={exporting}
              className="w-full rounded-xl border border-slate-300 px-4 py-3"
            >
              <option value="">All Seasons</option>
              {seasons.map((season) => (
                <option key={season.id} value={season.id}>
                  {season.name}{season.is_active === false ? " (Inactive)" : ""}
                </option>
              ))}
            </select>
          </FormField>

          <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-950">
            The CSV includes member contact details, role/status, ratings, and one row for each matching team assignment.
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={exporting}
              className="rounded-xl bg-slate-200 px-5 py-3 font-semibold text-slate-900 hover:bg-slate-300 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onExport}
              disabled={exporting}
              className="rounded-xl bg-emerald-700 px-5 py-3 font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
            >
              {exporting ? "Exporting..." : "Export CSV"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AddMemberModal({ form, locations, saving, onChange, onClose, onSave }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-950 px-5 py-4 text-white md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-xs font-black uppercase tracking-wide text-emerald-200">
              Member Administration
            </div>
            <h2 className="mt-1 text-2xl font-black">Add New Member</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-xl bg-white/10 px-4 py-2 text-sm font-bold text-white hover:bg-white/20 disabled:opacity-50"
          >
            Close
          </button>
        </div>

        <div className="max-h-[72vh] overflow-auto p-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField label="First Name">
              <input
                value={form.first_name}
                onChange={(e) => onChange("first_name", e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3"
              />
            </FormField>

            <FormField label="Last Name">
              <input
                value={form.last_name}
                onChange={(e) => onChange("last_name", e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3"
              />
            </FormField>

            <FormField label="Email">
              <input
                type="email"
                value={form.email}
                onChange={(e) => onChange("email", e.target.value)}
                placeholder="name@example.com"
                className="w-full rounded-xl border border-slate-300 px-4 py-3"
              />
            </FormField>

            <FormField label="Phone">
              <input
                value={form.phone}
                onChange={(e) => onChange("phone", formatPhoneNumberInput(e.target.value))}
                placeholder="(999) 999-9999"
                className="w-full rounded-xl border border-slate-300 px-4 py-3"
              />
            </FormField>

            <FormField label="League Notifications">
              <select
                value={form.notification_preference}
                onChange={(e) => onChange("notification_preference", e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3"
              >
                <option value={NOTIFICATION_EMAIL}>Email</option>
                <option value={NOTIFICATION_TEXT}>Text</option>
              </select>
            </FormField>

            <FormField label="Club / Home Community">
              <select
                value={form.club_location}
                onChange={(e) => onChange("club_location", e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3"
              >
                <option value="">Select Club / Home Community</option>
                {locations.map((location) => {
                  const locationName = location.name || location;

                  return (
                    <option
                      key={`${location.id || "no-id"}:${locationName}`}
                      value={locationName}
                    >
                      {locationName}
                    </option>
                  );
                })}
              </select>
            </FormField>

            <FormField label="DUPR ID">
              <input
                value={form.dupr_id}
                onChange={(e) => onChange("dupr_id", e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3"
              />
            </FormField>

            <FormField label="Renewal Date">
              <input
                type="date"
                value={form.renewal_date}
                onChange={(e) => onChange("renewal_date", e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3"
              />
            </FormField>

            <FormField label="Initial App Role">
              <select
                value={form.role}
                onChange={(e) => onChange("role", e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3"
              >
                <option value="player">Player</option>
                <option value="captain">Captain</option>
                <option value="club_pro">Club Pro</option>
                <option value="league_manager">League Manager</option>
                <option value="commissioner">Commissioner</option>
              </select>
            </FormField>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-xl bg-slate-200 px-5 py-3 font-bold text-slate-900 hover:bg-slate-300 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="rounded-xl bg-emerald-700 px-5 py-3 font-bold text-white hover:bg-emerald-800 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Create Member"}
          </button>
        </div>
      </div>
    </div>
  );
}

function MemberTeamsModal({ member, onClose }) {
  const teams = member.teams || [];
  const allTeams = member.all_teams || teams;
  const [showInactiveTeams, setShowInactiveTeams] = useState(false);
  const displayedTeams = showInactiveTeams ? allTeams : teams;
  const memberName =
    `${member.first_name || ""} ${member.last_name || ""}`.trim() ||
    member.email ||
    "Member";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
      <div className="max-h-[85vh] w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-950 px-5 py-4 text-white md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-xs font-black uppercase tracking-wide text-emerald-200">
              Current Teams
            </div>
            <h2 className="mt-1 text-2xl font-black">{memberName}</h2>
          </div>
          <div className="flex flex-wrap gap-2 md:justify-end">
            <button
              type="button"
              onClick={() => setShowInactiveTeams((value) => !value)}
              className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-emerald-400"
            >
              {showInactiveTeams ? "Show Current Teams" : "Show Inactive Teams"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-white/10 px-4 py-2 text-sm font-bold text-white hover:bg-white/20"
            >
              Close
            </button>
          </div>
        </div>

        <div className="max-h-[68vh] overflow-auto p-5">
          {displayedTeams.length === 0 ? (
            <div className="rounded-xl bg-slate-50 p-6 text-center text-slate-500">
              {showInactiveTeams
                ? "This member has no team history."
                : "This member is not currently on any active teams."}
            </div>
          ) : showInactiveTeams ? (
            <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
              {displayedTeams.map((team, index) => {
                const roleCode = memberTeamRoleCode(member.id, team);

                return (
                  <div
                    key={team.id || `${member.id}:team-history:${index}`}
                    className="grid grid-cols-1 gap-1 px-3 py-2 text-sm sm:grid-cols-[8rem_minmax(0,1.4fr)_minmax(0,1fr)_auto] sm:items-center"
                  >
                    <div className="font-bold text-slate-600">
                      {teamSeasonName(team)}
                    </div>
                    <div className="min-w-0 font-black text-slate-950">
                      {team.name || "Unnamed Team"}
                    </div>
                    <div className="min-w-0 font-semibold text-slate-600">
                      {team.divisions?.name || "Division TBD"}
                    </div>
                    <div className="flex flex-wrap gap-2 sm:justify-end">
                      {roleCode && (
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-black text-blue-900">
                          {roleCode}
                        </span>
                      )}
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-black uppercase tracking-wide ${
                        team.is_active === false
                          ? "bg-slate-200 text-slate-700"
                          : "bg-emerald-100 text-emerald-900"
                      }`}>
                        {team.is_active === false ? "Inactive" : "Active"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-3">
              {displayedTeams.map((team, index) => {
                const teamRole = team.roster_role || memberTeamRole(member.id, team);

                return (
                  <div
                    key={team.id || `${member.id}:team:${index}`}
                    className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                      <div className="min-w-0">
                        <div className="text-xs font-black uppercase tracking-wide text-slate-500">
                          Team
                        </div>
                        <div className="mt-1 break-words text-lg font-black text-slate-900">
                          {team.name || "Unnamed Team"}
                        </div>
                        <div className="mt-2 text-sm font-semibold text-slate-600">
                          {team.divisions?.leagues?.name || "League TBD"} / {team.divisions?.name || "Division TBD"}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 sm:justify-end">
                        <span className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-black uppercase tracking-wide text-blue-900">
                          {teamRole}
                        </span>
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide ${
                          team.is_active === false
                            ? "bg-slate-200 text-slate-700"
                            : "bg-emerald-100 text-emerald-900"
                        }`}>
                          {team.is_active === false ? "Inactive Team" : "Active Team"}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FormField({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-bold text-slate-700">{label}</span>
      {children}
    </label>
  );
}

function EditIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 20h9" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function Pagination({ page, totalPages, setPage, goToPage }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        disabled={page <= 1}
        onClick={() => setPage((p) => Math.max(1, p - 1))}
        className="rounded-lg bg-slate-200 px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
      >
        Previous
      </button>

      <div className="text-sm font-semibold text-slate-700">
        Page {page} of {totalPages}
      </div>

      <input
        type="number"
        min="1"
        max={totalPages}
        value={page}
        onChange={(e) => goToPage(e.target.value)}
        className="w-20 rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />

      <button
        disabled={page >= totalPages}
        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
        className="rounded-lg bg-slate-200 px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
      >
        Next
      </button>
    </div>
  );
}
